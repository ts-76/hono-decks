import { relative, resolve } from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { compileDecks } from "./node/compile-decks";
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
  let deckRoot = resolve(projectRoot, "decks");
  let resolvedConfig: ResolvedConfig | undefined;
  let server: ViteDevServer | undefined;
  let watchedPaths = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let compiling = false;
  let queued = false;

  const syncWatchedPaths = async (): Promise<void> => {
    if (!server) return;
    const next = new Set([deckRoot, configPath]);
    const removed = [...watchedPaths].filter((path) => !next.has(path));
    if (removed.length > 0) await server.watcher.unwatch(removed);
    server.watcher.add([...next]);
    watchedPaths = next;
  };

  const compileOnce = async (): Promise<void> => {
    const loaded = await loadDecksConfig({ cwd: projectRoot, configFile: options.configFile });
    const manifest = await compileDecks({
      cwd: projectRoot,
      root: loaded.root,
      out: loaded.outDir,
      mountPath: loaded.config.mountPath,
      ogpCacheFile: loaded.ogpCacheFile,
      refreshOgp: options.refreshOgp,
    });
    configPath = loaded.path;
    deckRoot = resolve(projectRoot, loaded.root);
    await syncWatchedPaths();
    resolvedConfig?.logger.info(`[hono-decks] Compiled ${manifest.decks.length} decks to ${loaded.outDir}`);
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
      if (latestCompileSucceeded && server) server.ws.send({ type: "full-reload" });
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
    if (absolutePath === configPath || isWithin(deckRoot, absolutePath)) scheduleCompile();
  };

  return {
    name: "hono-decks",
    enforce: "pre",
    async configResolved(config) {
      resolvedConfig = config;
      projectRoot = config.root;
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

function isWithin(root: string, path: string): boolean {
  const child = relative(root, path);
  return child === "" || (child !== ".." && !child.startsWith("../") && !child.startsWith("..\\"));
}
