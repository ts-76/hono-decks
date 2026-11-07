import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(repoRoot, "packages", "decks");
const viteVersion = process.env.HONO_DECKS_SMOKE_VITE_VERSION ?? "^8.0.0";
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
    `${JSON.stringify({ name: "hono-decks-smoke-consumer", private: true, type: "module", scripts: { build: "node build.mjs" } }, null, 2)}\n`,
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
      "hono@^4.13.16",
      "@types/node@^26.1.1",
      "typescript@^7.0.2",
      `vite@${viteVersion}`,
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
  "hono-decks/honox",
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

  // A fresh CLI consumer builds through its normal command, with no managed output in src.
  run(join(consumerRoot, "node_modules", ".bin", "hono-decks"), ["init"], { cwd: consumerRoot });
  writeFileSync(
    join(consumerRoot, "app.ts"),
    `
import { Hono } from "hono";
import { decks } from "./decks/index";
const app = new Hono();
app.route(decks.mountPath, decks.router());
export default app;
`,
  );
  writeFileSync(
    join(consumerRoot, "build.mjs"),
    `
import { build } from "esbuild";
await build({ entryPoints: ["app.ts"], bundle: true, platform: "neutral", format: "esm", outfile: "dist/worker.js" });
`,
  );
  const prepared = JSON.parse(readFileSync(join(consumerRoot, "package.json"), "utf8"));
  if (prepared.imports["#decks"] !== "./.hono-decks/decks.ts") throw new Error("Missing managed import");
  if (existsSync(join(consumerRoot, "src/generated"))) throw new Error("Unexpected generated source directory");
  run("npm", ["run", "build"], { cwd: consumerRoot });
  rmSync(join(consumerRoot, ".hono-decks"), { recursive: true, force: true });
  run("npm", ["run", "build"], { cwd: consumerRoot });
  writeFileSync(
    join(consumerRoot, "verify.mjs"),
    `
import app from "./dist/worker.js";
const response = await app.request("/decks/welcome/render");
if (response.status !== 200 || !(await response.text()).includes("Welcome")) throw new Error("Managed consumer failed");
`,
  );
  run(process.execPath, ["verify.mjs"], { cwd: consumerRoot });

  const typeSmokeScriptPath = join(consumerRoot, "type-smoke.ts");
  writeFileSync(
    typeSmokeScriptPath,
    `import type {
  DeckSource,
  DeckViewerOpenGraphInput,
  DeckViewerOpenGraphOptions,
  DecksConfig,
  DecksOptions,
} from "hono-decks";
import type { DecksRouterOptions } from "hono-decks/advanced";
import type { HydrateSlideIslandsInput } from "hono-decks/client";
import type { CompileDeckInput } from "hono-decks/node";
import type { HonoDecksViteOptions } from "hono-decks/vite";
import type { RunHonoDecksCliInput, RunHonoDecksCliResult } from "hono-decks/cli";

type PublicApiSmoke = {
  config: DecksConfig;
  options: DecksOptions;
  source: DeckSource;
  openGraphInput: DeckViewerOpenGraphInput;
  openGraphOptions: DeckViewerOpenGraphOptions;
  router: DecksRouterOptions;
  client: HydrateSlideIslandsInput;
  compile: CompileDeckInput;
  vite: HonoDecksViteOptions;
  cliInput: RunHonoDecksCliInput;
  cliResult: RunHonoDecksCliResult;
};

declare const publicApiSmoke: PublicApiSmoke;
void publicApiSmoke;
`,
  );
  run(
    join(consumerRoot, "node_modules", ".bin", "tsc"),
    [
      "--noEmit",
      "--strict",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--lib",
      "ESNext,DOM",
      typeSmokeScriptPath,
    ],
    { cwd: consumerRoot },
  );

  const installedPackage = JSON.parse(
    readFileSync(join(consumerRoot, "node_modules", "hono-decks", "package.json"), "utf8"),
  );
  if (installedPackage.version !== packResult.version) {
    throw new Error(
      `Installed version ${installedPackage.version} does not match packed version ${packResult.version}`,
    );
  }

  console.log(`Verified ${packResult.filename} on Node.js ${process.version} with Vite ${viteVersion}`);
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
