import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(repoRoot, "packages", "decks");
const temporaryRoot = mkdtempSync(join(tmpdir(), "hono-decks-package-"));
const consumerRoot = join(temporaryRoot, "consumer");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
}

try {
  const packResult = JSON.parse(
    run("npm", ["pack", packageRoot, "--ignore-scripts", "--json", "--pack-destination", temporaryRoot]),
  )[0];
  const packedPaths = new Set(packResult.files.map(({ path }) => path));

  for (const expectedPath of [
    "LICENSE",
    "README.md",
    "README.ja.md",
    "dist/bin.js",
    "dist/mod.js",
    "dist/mod.d.ts",
    "package.json",
  ]) {
    if (!packedPaths.has(expectedPath)) {
      throw new Error(`Packed package is missing ${expectedPath}`);
    }
  }

  const unexpectedPath = [...packedPaths].find((path) => path.startsWith("src/") || path.startsWith("test/"));
  if (unexpectedPath) {
    throw new Error(`Packed package unexpectedly contains ${unexpectedPath}`);
  }

  mkdirSync(consumerRoot);
  writeFileSync(
    join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "hono-decks-smoke-consumer", private: true, type: "module" }, null, 2)}\n`,
  );

  const tarballPath = join(temporaryRoot, packResult.filename);
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      tarballPath,
      "hono@^4.12.30",
      "vite@^8.0.0",
    ],
    { cwd: consumerRoot },
  );

  const smokeScriptPath = join(consumerRoot, "smoke.mjs");
  writeFileSync(
    smokeScriptPath,
    `const entrypoints = [
  "hono-decks",
  "hono-decks/advanced",
  "hono-decks/cli",
  "hono-decks/client",
  "hono-decks/node",
  "hono-decks/vite",
];

for (const entrypoint of entrypoints) {
  await import(entrypoint);
}
`,
  );

  run(process.execPath, [smokeScriptPath], { cwd: consumerRoot });
  run(join(consumerRoot, "node_modules", ".bin", "hono-decks"), ["--help"], {
    cwd: consumerRoot,
  });

  const installedPackage = JSON.parse(
    readFileSync(join(consumerRoot, "node_modules", "hono-decks", "package.json"), "utf8"),
  );
  if (installedPackage.version !== packResult.version) {
    throw new Error(
      `Installed version ${installedPackage.version} does not match packed version ${packResult.version}`,
    );
  }

  console.log(`Verified ${packResult.filename} on Node.js ${process.version}`);
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
