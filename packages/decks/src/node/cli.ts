import { existsSync, watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { compileDecks } from "./index";
import { DEFAULT_DECKS_CONFIG_FILE, loadDecksConfig } from "./config";

export interface RunHonoDecksCliInput {
  argv: string[];
  cwd: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  /** Stops a long-running `compile --watch` command. */
  signal?: AbortSignal;
  /** Test/tooling hook for filesystem watching. */
  watchFileSystem?(
    this: void,
    path: string,
    options: { recursive: boolean },
    listener: (eventType: "rename" | "change", filename: string | null) => void,
  ): { close(): void };
}

export interface RunHonoDecksCliResult {
  exitCode: number;
}

interface CompileCommandOptions {
  configFile?: string;
  watch?: boolean;
  refreshOgp?: boolean;
}

interface InitCommandOptions {
  configFile?: string;
  out?: string;
  framework?: "void" | "hono" | "honox";
  entry?: string;
  install?: boolean;
  adapter?: string;
}

const USAGE = `Usage:
  hono-decks init [--config <file>] [--out <file>]
  hono-decks init --framework <hono|honox|void> [--config <file>] [--entry <file>] [--install [--adapter <spec>]]
  hono-decks compile [--config <file>] [--watch] [--refresh-ogp]

Commands:
  init      Create hono-decks.config.ts, the app-owned src/decks.ts, and a sample deck.
            Without --framework, decks are compiled to files by \`hono-decks compile\`
            (wire it into Wrangler's build.command). With --framework, the existing
            Vite config gets the honoDecks() plugin and no compile step is needed.
  compile   Compile decks to the build.outDir from the config. Alias: build.

Options:
  --config <file>          Config file. Default: hono-decks.config.ts
  --out <file>             init: app-owned decks module. Default: src/decks.ts
  --framework <name>       init: integrate with an existing Vite app (hono, honox, or void).
  --entry <file>           init --framework hono: Hono app entry. Default: auto-detect.
  --install                init --framework void: install missing dependencies.
  --adapter <spec>         init --framework void --install: Hono Markdown adapter version or tarball.
  --watch                  compile: recompile when decks or the config change.
  --refresh-ogp            compile: refresh link card metadata from the network.
  -h, --help               Show this help.`;

export async function runHonoDecksCli(input: RunHonoDecksCliInput): Promise<RunHonoDecksCliResult> {
  const stdout = input.stdout ?? (() => undefined);
  const stderr = input.stderr ?? (() => undefined);
  const [command, ...args] = input.argv;

  if (!command || command === "--help" || command === "-h") {
    stdout(USAGE);
    return { exitCode: 0 };
  }

  if (command === "init") return runInitCommand(input, args, stdout, stderr);
  if (command !== "compile" && command !== "build") {
    stderr(`Unknown command: ${command}`);
    stderr(USAGE);
    return { exitCode: 1 };
  }

  const parsed = parseCompileArgs(args);
  if (parsed.help) {
    stdout(USAGE);
    return { exitCode: 0 };
  }
  if (parsed.error) {
    stderr(parsed.error);
    stderr(USAGE);
    return { exitCode: 1 };
  }

  const compile = async (): Promise<{ root: string; configPath: string }> => {
    const loaded = await loadDecksConfig({ cwd: input.cwd, configFile: parsed.options.configFile });
    const manifest = await compileDecks({
      cwd: input.cwd,
      root: loaded.root,
      out: loaded.outDir,
      mountPath: loaded.config.mountPath,
      ogpCacheFile: loaded.ogpCacheFile,
      markdown: loaded.config.build?.markdown,
      refreshOgp: parsed.options.refreshOgp,
    });
    stdout(`Compiled ${manifest.decks.length} decks to ${loaded.outDir}`);
    return { root: loaded.root, configPath: loaded.path };
  };

  try {
    const initial = await compile();
    if (!parsed.options.watch) return { exitCode: 0 };
    stdout(`Watching ${initial.root} and ${relative(input.cwd, initial.configPath)}`);
    await watchAndCompile({ ...input, root: initial.root, configPath: initial.configPath, compile, stderr });
    return { exitCode: 0 };
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return { exitCode: 1 };
  }
}

async function watchAndCompile(
  input: RunHonoDecksCliInput & {
    root: string;
    configPath: string;
    compile(): Promise<{ root: string; configPath: string }>;
    stderr(line: string): void;
  },
): Promise<void> {
  const watchFileSystem = input.watchFileSystem ?? watch;
  let watchedRoot = input.root;
  let deckWatcher: { close(): void };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let compiling = false;
  let queued = false;
  const run = async () => {
    if (compiling) {
      queued = true;
      return;
    }
    compiling = true;
    try {
      const next = await input.compile();
      if (next.root !== watchedRoot) {
        deckWatcher.close();
        watchedRoot = next.root;
        deckWatcher = watchFileSystem(join(input.cwd, watchedRoot), { recursive: true }, schedule);
      }
    } catch (error) {
      input.stderr(error instanceof Error ? error.message : String(error));
    } finally {
      compiling = false;
      if (queued) {
        queued = false;
        await run();
      }
    }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), 75);
  };
  deckWatcher = watchFileSystem(join(input.cwd, watchedRoot), { recursive: true }, schedule);
  const configWatcher = watchFileSystem(input.configPath, { recursive: false }, schedule);

  await new Promise<void>((resolve) => {
    if (input.signal?.aborted) return resolve();
    input.signal?.addEventListener("abort", () => resolve(), { once: true });
  });
  if (timer) clearTimeout(timer);
  deckWatcher.close();
  configWatcher.close();
}

async function runInitCommand(
  input: RunHonoDecksCliInput,
  args: string[],
  stdout: (line: string) => void,
  stderr: (line: string) => void,
): Promise<RunHonoDecksCliResult> {
  const parsed = parseInitArgs(args);
  if (parsed.help) {
    stdout(USAGE);
    return { exitCode: 0 };
  }
  if (parsed.error) {
    stderr(parsed.error);
    stderr(USAGE);
    return { exitCode: 1 };
  }

  if (parsed.options.framework) {
    try {
      const { initializeVite } = await import("./init-vite");
      const sampleSlug = await initializeVite(
        input.cwd,
        parsed.options.framework,
        parsed.options.configFile,
        parsed.options.entry,
        parsed.options.install ? { adapter: parsed.options.adapter } : undefined,
      );
      stdout(
        `Initialized ${parsed.options.framework} decks at /decks/${sampleSlug}. Run your usual dev or build command; no manual compile is needed.`,
      );
      return { exitCode: 0 };
    } catch (error) {
      stderr(error instanceof Error ? error.message : String(error));
      return { exitCode: 1 };
    }
  }

  const configFile = normalizeOutputFile(parsed.options.configFile ?? DEFAULT_DECKS_CONFIG_FILE);
  const out = normalizeOutputFile(parsed.options.out ?? "src/decks.ts");
  try {
    const created = await writeInitialFiles({ cwd: input.cwd, configFile, out });
    stdout(`Created ${created.join(", ")}.`);
    stdout("Next: run `hono-decks compile`, then mount it with app.route(decks.mountPath, decks.router()).");
    return { exitCode: 0 };
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return { exitCode: 1 };
  }
}

function parseCompileArgs(args: string[]): { options: CompileCommandOptions; error?: string; help?: boolean } {
  const options: CompileCommandOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { options, help: true };
    if (arg === "--watch") {
      options.watch = true;
      continue;
    }
    if (arg === "--refresh-ogp") {
      options.refreshOgp = true;
      continue;
    }
    if (arg === "--config") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      options.configFile = value;
      index += 1;
      continue;
    }
    return { options, error: `Unknown option: ${arg}` };
  }
  return { options };
}

function parseInitArgs(args: string[]): { options: InitCommandOptions; error?: string; help?: boolean } {
  const options: InitCommandOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { options, help: true };
    if (arg === "--install") {
      options.install = true;
      continue;
    }
    if (
      arg === "--adapter" ||
      arg === "--config" ||
      arg === "--out" ||
      arg === "--framework" ||
      arg === "--entry"
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      if (arg === "--framework") {
        if (value !== "void" && value !== "hono" && value !== "honox")
          return { options, error: `Unsupported framework: ${value}. Expected hono, honox, or void.` };
        options.framework = value;
      }
      if (arg === "--adapter") options.adapter = value;
      if (arg === "--config") options.configFile = value;
      if (arg === "--entry") options.entry = value;
      if (arg === "--out") options.out = value;
      index += 1;
      continue;
    }
    return { options, error: `Unknown option: ${arg}` };
  }
  if ((options.install && options.framework !== "void") || (options.adapter && !options.install))
    return { options, error: "--install requires --framework void; --adapter also requires --install." };
  if (options.entry && options.framework !== "hono") {
    return { options, error: "--entry requires --framework hono." };
  }
  if (options.framework && options.out) {
    return { options, error: "Framework init uses virtual modules; --out is only supported by generic init." };
  }
  return { options };
}

const GENERATED_DIR = "src/generated";

async function writeInitialFiles(input: { cwd: string; configFile: string; out: string }): Promise<string[]> {
  for (const path of [input.configFile, input.out]) {
    if (existsSync(join(input.cwd, path))) throw new Error(`Refusing to overwrite existing file: ${path}`);
  }
  const files = [
    { path: input.configFile, content: emitDecksConfig() },
    { path: input.out, content: emitDecksFacade(relativeImport(input.out, `${GENERATED_DIR}/decks.ts`)) },
  ];
  if (!existsSync(join(input.cwd, "decks"))) files.push({ path: "decks/welcome/deck.mdx", content: SAMPLE_DECK });
  for (const file of files) {
    await mkdir(join(input.cwd, dirname(file.path)), { recursive: true });
    await writeFile(join(input.cwd, file.path), file.content, "utf8");
  }
  const created = files.map((file) => file.path);
  if (await ignoreGeneratedDirectory(input.cwd)) created.push(".gitignore");
  return created;
}

/** Generated modules are rebuilt by every dev/build command, so keep them out of version control. */
async function ignoreGeneratedDirectory(cwd: string): Promise<boolean> {
  const path = join(cwd, ".gitignore");
  const current = existsSync(path) ? await readFile(path, "utf8") : "";
  const entry = `/${GENERATED_DIR}/`;
  if (current.split(/\r?\n/).some((line) => line.trim() === entry || line.trim() === `${GENERATED_DIR}/`)) return false;
  await writeFile(path, `${current}${current && !current.endsWith("\n") ? "\n" : ""}${entry}\n`, "utf8");
  return true;
}

function emitDecksConfig(): string {
  return `import { defineDecksConfig } from "hono-decks";

// Build-only settings read by \`hono-decks compile\`. Runtime options belong in src/decks.ts.
export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "${GENERATED_DIR}",
  },
});
`;
}

function emitDecksFacade(generated: string): string {
  return `import { createDecks } from ${JSON.stringify(generated)};

// Runtime options (viewer, presenter, export, source, ...) go here.
export const decks = createDecks();
`;
}

const SAMPLE_DECK = `---
title: Welcome
---

# Welcome

Edit decks/welcome/deck.mdx to write your slides.

---

# Next slide

Separate slides with a line containing only three dashes.
`;

function relativeImport(fromFile: string, toFile: string): string {
  const path = normalizePath(relative(dirname(fromFile), toFile)).replace(/\.(?:[cm]?[jt]sx?)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

function normalizeOutputFile(path: string): string {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const segments = normalized.split("/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || segments.includes("..")) {
    throw new Error("File must be a relative path inside the current working directory");
  }
  return normalized;
}

function normalizePath(path: string): string {
  return path
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  return normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : ".";
}
