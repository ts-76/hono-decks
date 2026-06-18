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
}

const USAGE = `Usage:
  hono-decks compile --root decks --out src/generated [--mount /slides]

Commands:
  compile, build   Compile local deck files into a generated manifest module.

Options:
  --root <path>            Deck root directory relative to the current working directory.
  --out <path>             Output directory for generated deck modules.
  --mount <path>           Public mount path used for local asset URLs.
  -h, --help               Show this help.`;

export async function runHonoDecksCli(input: RunHonoDecksCliInput): Promise<RunHonoDecksCliResult> {
  const stdout = input.stdout ?? (() => undefined);
  const stderr = input.stderr ?? (() => undefined);
  const [command, ...args] = input.argv;

  if (!command || command === "--help" || command === "-h") {
    stdout(USAGE);
    return { exitCode: 0 };
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
    });
    stdout(`Compiled ${manifest.decks.length} decks to ${out}`);
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

    if (arg === "--root" || arg === "--out" || arg === "--mount") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) return { options, error: `Missing value for ${arg}` };
      index += 1;
      if (arg === "--root") options.root = value;
      if (arg === "--out") options.out = value;
      if (arg === "--mount") options.mountPath = value;
      continue;
    }

    return { options, error: `Unknown option: ${arg}` };
  }

  return { options };
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
