#!/usr/bin/env node
import { runHonoSlidesCli } from "./node/cli";

declare const process: {
  argv: string[];
  cwd(): string;
  stdout: { write(value: string): void };
  stderr: { write(value: string): void };
  exitCode?: number;
};

const result = await runHonoSlidesCli({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stdout: (line) => process.stdout.write(`${line}\n`),
  stderr: (line) => process.stderr.write(`${line}\n`),
});

process.exitCode = result.exitCode;
