import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface VoidInstallOptions {
  adapter?: string;
  run?(this: void, command: string, args: string[], cwd: string): Promise<void>;
}

export async function installVoidDependencies(cwd: string, options: VoidInstallOptions = {}): Promise<void> {
  if (options.adapter?.startsWith("-")) throw new Error("--adapter must be a package specifier or tarball path.");
  if (existsSync(join(cwd, ".pnp.cjs")))
    throw new Error("--install requires the node_modules linker; install dependencies manually for Yarn PnP.");
  const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
  const declared = pkg.packageManager?.match(/^(npm|pnpm|yarn|bun)@(\d+)/);
  if (pkg.packageManager && !declared) throw new Error("Unsupported packageManager; use npm, pnpm, yarn, or bun.");
  const locks = [
    ["npm", "package-lock.json"],
    ["npm", "npm-shrinkwrap.json"],
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lock"],
    ["bun", "bun.lockb"],
  ]
    .filter(([, file]) => existsSync(join(cwd, file!)))
    .map(([manager]) => manager!);
  if (!declared && new Set(locks).size > 1)
    throw new Error("Multiple package-manager lockfiles found; set packageManager before --install.");
  const manager: string = declared?.[1] ?? locks[0] ?? "npm";
  const modernYarn =
    manager === "yarn" &&
    (declared
      ? Number(declared[2]) >= 2
      : (await readFile(join(cwd, "yarn.lock"), "utf8").catch(() => "")).includes("__metadata:"));
  const require = createRequire(join(cwd, "package.json"));
  const missing = (id: string) => {
    try {
      require.resolve(id);
      return false;
    } catch {
      return true;
    }
  };
  const required = [
    ["void", "void@>=1.1.11 <1.2.0"],
    ["vite", "vite@^8.0.16"],
    ["hono", "hono@^4.13.13"],
    ["markdown-exit", "markdown-exit@^1.3.0"],
    ["yaml", "yaml@^2.9.1"],
    ["markdown-it-container", "markdown-it-container@^4.0.0"],
    ["shiki", "shiki@^4.5.0"],
    ["@shikijs/transformers", "@shikijs/transformers@^4.5.0"],
  ];
  for (const [id, spec] of required) {
    if (missing(id!)) continue;
    const version = await installedVersion(require.resolve(id!), id!);
    const minimum = spec!.match(/(?:\^|>=)(\d+)\.(\d+)\.(\d+)/)!;
    if (version) {
      const value = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
      const min = minimum.slice(1).map(Number);
      const current = value?.slice(1).map(Number);
      if (!current || current[0] !== min[0] || (id === "void" && current[1] !== 1) || compare(current, min) < 0) {
        throw new Error(
          `Installed ${id}@${version} is incompatible with ${spec}. Update it explicitly before --install.`,
        );
      }
    }
  }
  const specs = required.filter(([id]) => missing(id!)).map(([, spec]) => spec!);
  let packageDirectory = cwd;
  let hasLocalDecks = false;
  while (true) {
    if (existsSync(join(packageDirectory, "node_modules/hono-decks/package.json"))) {
      hasLocalDecks = true;
      break;
    }
    const parent = dirname(packageDirectory);
    if (parent === packageDirectory) break;
    packageDirectory = parent;
  }
  if (!hasLocalDecks) {
    let ownPackage: string;
    try {
      ownPackage = await readFile(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8");
    } catch {
      ownPackage = await readFile(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8");
    }
    const requested =
      pkg.dependencies?.["hono-decks"] ?? pkg.devDependencies?.["hono-decks"] ?? JSON.parse(ownPackage).version;
    specs.push(`hono-decks@${requested}`);
  }
  if (options.adapter || missing("void-plugin-hono-jsx/markdown/compiler")) {
    let adapter = options.adapter ?? "void-plugin-hono-jsx";
    if (/^\d+\./.test(adapter)) adapter = "void-plugin-hono-jsx@" + adapter;
    else if (modernYarn && (adapter.endsWith(".tgz") || adapter.startsWith("file:")))
      adapter = "void-plugin-hono-jsx@file:" + resolve(cwd, adapter.replace(/^file:/, ""));
    specs.push(adapter);
  }
  if (specs.length) {
    const args =
      manager === "npm"
        ? ["install", "--ignore-scripts", "--no-audit", "--no-fund"]
        : manager === "yarn"
          ? ["add", ...(modernYarn ? ["--mode=skip-build"] : ["--ignore-scripts"])]
          : ["add", "--ignore-scripts"];
    const run =
      options.run ??
      ((command, args, cwd) =>
        new Promise<void>((resolve, reject) => {
          execFile(command, args, { cwd }, (error, _stdout, stderr) =>
            error ? reject(new Error(`Dependency installation failed: ${stderr || error.message}`)) : resolve(),
          );
        }));
    await run(manager, [...args, ...specs], cwd);
  }
  // A fresh process avoids Node's cached missing package manifests after install.
  const check = `import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(process.cwd() + "/package.json");
for (const id of ${JSON.stringify(required.map(([id]) => id))}) require.resolve(id);
const compiler = await import(pathToFileURL(require.resolve("void-plugin-hono-jsx/markdown/compiler")).href);
if (typeof compiler.compileMarkdownModule !== "function" || typeof compiler.readMarkdownModule !== "function") throw new Error("Missing module compiler API");`;
  await new Promise<void>((resolve, reject) => {
    execFile(process.execPath, ["--input-type=module", "--eval", check], { cwd }, (error, _stdout, stderr) => {
      if (error)
        reject(
          new Error(
            "The installed Hono Markdown adapter lacks the required module compiler API or peers. Use --adapter with a compatible version or tarball. Dependencies may have changed; app integration files were not written. " +
              stderr,
          ),
        );
      else resolve();
    });
  });
}

async function installedVersion(entry: string, name: string): Promise<string | undefined> {
  let directory = dirname(entry);
  while (true) {
    try {
      const pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
      if (pkg.name === name) return pkg.version;
    } catch {
      /* Continue to the owning package manifest. */
    }
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}
function compare(a: number[], b: number[]): number {
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index]! - b[index]!;
  return 0;
}
