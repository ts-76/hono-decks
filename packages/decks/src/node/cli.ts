import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DECKS_RUNTIME_ENTRY } from "../generator/package-entry";
import { compileDecks } from "./index";

export interface RunHonoDecksCliInput {
  argv: string[];
  cwd: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

export interface RunHonoDecksCliResult {
  exitCode: number;
}

interface CompileCommandOptions {
  root?: string;
  out?: string;
  mountPath?: string;
  ogpCacheFile?: string;
  refreshOgp?: boolean;
}

interface InitCommandOptions {
  out?: string;
  generated?: string;
}

const USAGE = `Usage:
  hono-decks compile --root decks --out src/generated [--mount /slides] [--ogp-cache decks/ogp-cache.json] [--refresh-ogp]
  hono-decks init --out src/decks.ts [--generated ./generated/decks]

Commands:
  compile, build   Compile local deck files into a generated manifest module.
  init             Create an app-owned decks facade file.

Options:
  --root <path>            Deck root directory relative to the current working directory.
  --out <path>             Output directory for generated deck modules.
  --mount <path>           Public mount path used for local asset URLs.
  --ogp-cache <path>       JSON cache file for deterministic LinkCard OGP metadata.
  --refresh-ogp            Refresh OGP cache entries from the network.
  --generated <path>       Generated decks module import path for init.
  -h, --help               Show this help.`;

export async function runHonoDecksCli(input: RunHonoDecksCliInput): Promise<RunHonoDecksCliResult> {
  const stdout = input.stdout ?? (() => undefined);
  const stderr = input.stderr ?? (() => undefined);
  const [command, ...args] = input.argv;

  if (!command || command === "--help" || command === "-h") {
    stdout(USAGE);
    return { exitCode: 0 };
  }

  if (command === "init") {
    return runInitCommand(input, args, stdout, stderr);
  }

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

  const root = parsed.options.root;
  const out = parsed.options.out;
  if (!root) {
    stderr("Missing required option: --root");
    stderr(USAGE);
    return { exitCode: 1 };
  }
  if (!out) {
    stderr("Missing required option: --out");
    stderr(USAGE);
    return { exitCode: 1 };
  }

  try {
    const manifest = await compileDecks({
      cwd: input.cwd,
      root,
      out,
      mountPath: parsed.options.mountPath,
      ogpCacheFile: parsed.options.ogpCacheFile,
      refreshOgp: parsed.options.refreshOgp,
    });
    stdout(`Compiled ${manifest.decks.length} decks to ${out}`);
    return { exitCode: 0 };
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return { exitCode: 1 };
  }
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

  const out = parsed.options.out;
  if (!out) {
    stderr("Missing required option: --out");
    stderr(USAGE);
    return { exitCode: 1 };
  }

  try {
    await writeDecksFacade({
      cwd: input.cwd,
      out,
      generated: parsed.options.generated ?? "./generated/decks",
    });
    stdout(`Initialized decks facade at ${out}`);
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

    if (arg === "--refresh-ogp") {
      options.refreshOgp = true;
      continue;
    }

    if (arg === "--root" || arg === "--out" || arg === "--mount" || arg === "--ogp-cache") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      index += 1;
      if (arg === "--root") options.root = value;
      if (arg === "--out") options.out = value;
      if (arg === "--mount") options.mountPath = value;
      if (arg === "--ogp-cache") options.ogpCacheFile = value;
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

    if (arg === "--out" || arg === "--generated") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      index += 1;
      if (arg === "--out") options.out = value;
      if (arg === "--generated") options.generated = value;
      continue;
    }

    return { options, error: `Unknown option: ${arg}` };
  }

  return { options };
}

async function writeDecksFacade(input: { cwd: string; out: string; generated: string }): Promise<void> {
  const out = normalizeOutputFile(input.out);
  const fullPath = join(input.cwd, out);

  if (await fileExists(fullPath)) {
    throw new Error(`Refusing to overwrite existing file: ${out}`);
  }

  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, emitDecksFacade(input.generated), "utf8");
}

async function fileExists(path: string): Promise<boolean> {
  return existsSync(path);
}

function normalizeOutputFile(path: string): string {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const segments = normalized.split("/");

  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.includes("..")
  ) {
    throw new Error("Output file must be a relative path inside the current working directory");
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

function emitDecksFacade(generated: string): string {
  return `// App-owned facade for hono-decks.
// This file is safe to edit. \`src/generated/decks.ts\` is generated by \`hono-decks compile\`.
import type { DecksRouterOverrides } from ${JSON.stringify(DECKS_RUNTIME_ENTRY)};
import { decks } from ${JSON.stringify(generated)};

export const deckSource = decks.source;

export function createDecksRouter(options: DecksRouterOverrides = {}) {
  return decks.router({
    source: deckSource,
    ...options,
  });
}
`;
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
