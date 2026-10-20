import { realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { mergeConfig, type Plugin, type ResolvedConfig, type UserConfigExport, type ViteDevServer } from "vite";
import { transform } from "esbuild";
import { compileDeckModules } from "./node/compile-decks";
import { publishGeneratedFiles } from "./node/file-transaction";
import { dirname } from "./node/path-utils";
import { DEFAULT_DECKS_CONFIG_FILE, loadDecksConfig } from "./node/config";

/** Options for the Hono Decks Vite integration. */
export interface HonoDecksViteOptions {
  /** Config file relative to Vite's project root. */
  configFile?: string;
  /** Refresh remote OGP metadata during compilation. */
  refreshOgp?: boolean;
}

/**
 * Compiles decks before Vite starts and regenerates them while authoring.
 *
 * Add this plugin to the same Vite config that hosts Hono or HonoX. The
 * project's ordinary `vite` development command is then sufficient; no
 * separate `hono-decks compile --watch` process is required.
 */
export function honoDecks(options: HonoDecksViteOptions = {}): Plugin {
  let projectRoot = process.cwd();
  let configPath = resolve(projectRoot, options.configFile ?? DEFAULT_DECKS_CONFIG_FILE);
  let configDependencies = new Set<string>();
  let deckRoot = resolve(projectRoot, "decks");
  let resolvedConfig: ResolvedConfig | undefined;
  let server: ViteDevServer | undefined;
  let watchedPaths = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let compiling = false;
  let queued = false;
  let compiledMountPath: string | undefined;
  let mountChanged = false;
  let modules = new Map<string, string>();
  let routerModulePath = "";

  const syncWatchedPaths = async (): Promise<void> => {
    if (!server) return;
    const next = new Set([deckRoot, configPath, ...configDependencies]);
    const removed = [...watchedPaths].filter((path) => !next.has(path));
    if (removed.length > 0) server.watcher.unwatch(removed);
    server.watcher.add([...next]);
    watchedPaths = next;
  };

  const compileOnce = async (): Promise<void> => {
    const loaded = await loadDecksConfig({ cwd: projectRoot, configFile: options.configFile });
    configDependencies = new Set(loaded.dependencies);
    await syncWatchedPaths();
    const compiled = await compileDeckModules({
      cwd: projectRoot,
      root: loaded.root,
      out: loaded.outDir,
      mountPath: loaded.config.mountPath,
      ogpCacheFile: loaded.ogpCacheFile,
      markdown: loaded.config.build?.markdown,
      refreshOgp: options.refreshOgp,
    });
    // Publish only an explicitly configured data cache. Generated code stays in
    // memory, and a failed compilation keeps the previous complete module map.
    if (compiled.cacheFile) await publishGeneratedFiles([compiled.cacheFile]);
    modules = new Map(compiled.modules.map((file) => [resolve(file.path), file.content]));
    routerModulePath = resolve(projectRoot, compiled.result.routerModulePath);
    mountChanged ||= compiledMountPath !== undefined && compiledMountPath !== loaded.config.mountPath;
    compiledMountPath = loaded.config.mountPath;
    configPath = loaded.path;
    deckRoot = resolve(projectRoot, loaded.root);
    await syncWatchedPaths();
    resolvedConfig?.logger.info(`[hono-decks] Compiled ${compiled.result.decks.length} decks as virtual modules`);
  };

  const compile = async (fatal: boolean): Promise<void> => {
    if (compiling) {
      queued = true;
      return;
    }
    compiling = true;
    let latestCompileSucceeded = false;
    try {
      do {
        queued = false;
        try {
          await compileOnce();
          latestCompileSucceeded = true;
        } catch (error) {
          latestCompileSucceeded = false;
          if (fatal) throw error;
          resolvedConfig?.logger.error(`[hono-decks] ${error instanceof Error ? error.message : String(error)}`);
        }
      } while (queued);
      if (latestCompileSucceeded && server) {
        if (mountChanged) {
          // A changed mount rebuilds route registrations. Restart the SSR app
          // after compilation instead of mixing old and new module instances.
          mountChanged = false;
          await server.restart();
          return;
        }
        // Atomic file replacement can finish before Vite's filesystem events are
        // processed. Clear server-side caches before asking browsers to reload.
        for (const environment of Object.values(server.environments)) {
          environment.moduleGraph.invalidateAll();
          if (environment.name !== "client") environment.hot.send({ type: "full-reload" });
        }
        server.ws.send({ type: "full-reload" });
      }
    } finally {
      compiling = false;
    }
  };

  const scheduleCompile = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void compile(false), 75);
  };

  const onWatcherEvent = (event: string, path: string): void => {
    if (event !== "add" && event !== "change" && event !== "unlink") return;
    const absolutePath = resolve(projectRoot, path);
    if (absolutePath === configPath || configDependencies.has(absolutePath) || isWithin(deckRoot, absolutePath))
      scheduleCompile();
  };

  return {
    name: "hono-decks",
    enforce: "pre",
    async resolveId(id, importer) {
      if (id === "virtual:hono-decks") return VIRTUAL_ENTRY;
      if (id.startsWith(PUBLIC_MODULE_PREFIX)) {
        const path = decodeURIComponent(id.slice(PUBLIC_MODULE_PREFIX.length));
        return modules.has(path) ? MODULE_PREFIX + path : null;
      }
      if (importer?.startsWith(MODULE_PREFIX)) {
        const parent = importer.slice(MODULE_PREFIX.length);
        if (id.startsWith(".")) {
          const path = resolve(dirname(parent), id);
          const generated = findModule(modules, path);
          if (generated) return MODULE_PREFIX + generated;
          return this.resolve(path, undefined, { skipSelf: true });
        }
        return this.resolve(id, resolve(projectRoot, "package.json"), { skipSelf: true });
      }
      // Existing Vite facades may still import their old generated path. Keep
      // them working through the virtual graph without requiring files on disk.
      if (id.startsWith(".") || id.startsWith("/")) {
        const path = id.startsWith(".") ? resolve(importer ? dirname(importer.split("?")[0]!) : projectRoot, id) : id;
        const generated = findModule(modules, path);
        if (generated) return MODULE_PREFIX + generated;
      }
      return null;
    },
    async load(id) {
      if (id === VIRTUAL_ENTRY) {
        return `import config from ${JSON.stringify(configPath)};
import { createDecks } from ${JSON.stringify(PUBLIC_MODULE_PREFIX + encodeURIComponent(routerModulePath))};
export { createDecks };
export const decks = createDecks(config);`;
      }
      if (!id.startsWith(MODULE_PREFIX)) return null;
      const path = id.slice(MODULE_PREFIX.length);
      const code = modules.get(path);
      if (code === undefined) return null;
      // Virtual IDs do not have a physical TS file for Vite's normal TS loader.
      // Strip types here; authored TSX and all imports still go through Vite.
      return (await transform(code, { loader: "ts", format: "esm", sourcefile: path, sourcemap: "inline" })).code;
    },
    config() {
      // Transaction staging is not app content. HonoX restarts on watcher add/
      // unlink events, so exposing these temporary files causes restart loops.
      return { server: { watch: { ignored: [/(?:^|[/\\])\.hono-decks-[^/\\]+(?:[/\\]|$)/] } } };
    },
    async configResolved(config) {
      resolvedConfig = config;
      projectRoot = config.resolve?.preserveSymlinks ? config.root : await realpath(config.root);
      configPath = resolve(projectRoot, options.configFile ?? DEFAULT_DECKS_CONFIG_FILE);
      await compile(true);
    },
    configureServer(devServer) {
      server = devServer;
      void syncWatchedPaths();
      devServer.watcher.on("all", onWatcherEvent);
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        devServer.watcher.off("all", onWatcherEvent);
        server = undefined;
        watchedPaths.clear();
      };
      devServer.httpServer?.once("close", cleanup);
    },
  };
}

const VIRTUAL_ENTRY = "\0hono-decks:entry";
const PUBLIC_MODULE_PREFIX = "virtual:hono-decks/module/";
const MODULE_PREFIX = "\0hono-decks:module:";

function findModule(modules: Map<string, string>, path: string): string | undefined {
  return [path, path.replace(/\.js$/, ".ts"), path + ".ts", path + "/index.ts"].find((candidate) =>
    modules.has(candidate),
  );
}

function isWithin(root: string, path: string): boolean {
  const child = relative(root, path);
  return child === "" || (child !== ".." && !child.startsWith("../") && !child.startsWith("..\\"));
}

/** Add deck compilation to an existing object, promise, or config function. */
export function withHonoDecks(config: UserConfigExport, options: HonoDecksViteOptions = {}): UserConfigExport {
  return async (env) =>
    mergeConfig(await (typeof config === "function" ? config(env) : config), {
      plugins: [honoDecks(options)],
    });
}
