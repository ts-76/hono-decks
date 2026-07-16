import { runHonoDecksCli } from "./node/cli";

export { runHonoDecksCli };
export type { RunHonoDecksCliInput, RunHonoDecksCliResult } from "./node/cli";

declare const process:
  | {
      argv: string[];
      cwd(): string;
      stdout: { write(value: string): void };
      stderr: { write(value: string): void };
      exitCode?: number;
    }
  | undefined;

if (typeof process !== "undefined" && process.argv[1]?.endsWith("/cli.ts")) {
  const result = await runHonoDecksCli({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
  process.exitCode = result.exitCode;
}
