import { existsSync, watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
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
  generated?: string;
}

const USAGE = `Usage:
  hono-decks init [--config hono-decks.config.ts] [--out src/decks.ts]
  hono-decks compile [--config hono-decks.config.ts] [--watch] [--refresh-ogp]

Commands:
  init             Create a shared config and app-owned decks facade.
  compile, build   Compile decks using the shared config.

Options:
  --config <path>          Config file. Default: hono-decks.config.ts
  --out <path>             Facade output for init. Default: src/decks.ts
  --generated <path>       Generated module import for init. Default: ./generated/decks
  --watch                  Recompile when deck files change.
  --refresh-ogp            Refresh OGP cache entries from the network.
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

async function watchAndCompile(input: RunHonoDecksCliInput & {
  root: string;
  configPath: string;
  compile(): Promise<{ root: string; configPath: string }>;
  stderr(line: string): void;
}): Promise<void> {
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

  const configFile = normalizeOutputFile(parsed.options.configFile ?? DEFAULT_DECKS_CONFIG_FILE);
  const out = normalizeOutputFile(parsed.options.out ?? "src/decks.ts");
  try {
    await writeInitialFiles({
      cwd: input.cwd,
      configFile,
      out,
      generated: parsed.options.generated ?? "./generated/decks",
    });
    stdout(`Initialized ${configFile} and ${out}`);
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
    if (arg === "--config" || arg === "--out" || arg === "--generated") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      if (arg === "--config") options.configFile = value;
      if (arg === "--out") options.out = value;
      if (arg === "--generated") options.generated = value;
      index += 1;
      continue;
    }
    return { options, error: `Unknown option: ${arg}` };
  }
  return { options };
}

async function writeInitialFiles(input: {
  cwd: string;
  configFile: string;
  out: string;
  generated: string;
}): Promise<void> {
  for (const path of [input.configFile, input.out]) {
    if (existsSync(join(input.cwd, path))) throw new Error(`Refusing to overwrite existing file: ${path}`);
  }
  const configPath = join(input.cwd, input.configFile);
  const facadePath = join(input.cwd, input.out);
  await mkdir(dirname(configPath), { recursive: true });
  await mkdir(dirname(facadePath), { recursive: true });
  await writeFile(configPath, emitDecksConfig(), "utf8");
  await writeFile(facadePath, emitDecksFacade(input.generated, relativeImport(input.out, input.configFile)), "utf8");
}

function emitDecksConfig(): string {
  return `import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
});
`;
}

function emitDecksFacade(generated: string, configImport: string): string {
  return `// App-owned facade. Files under the generated directory are overwritten.
import config from ${JSON.stringify(configImport)};
import { createDecks } from ${JSON.stringify(generated)};

export const decks = createDecks(config);
`;
}

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
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  return normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : ".";
}

declare const process:
  | {
      argv: string[];
      cwd(): string;
      stdout: { write(value: string): void };
      stderr: { write(value: string): void };
      exitCode?: number;
    }
  | undefined;

if (typeof process !== "undefined" && process.argv[1]?.endsWith("/node/cli.ts")) {
  const result = await runHonoDecksCli({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
  process.exitCode = result.exitCode;
}
