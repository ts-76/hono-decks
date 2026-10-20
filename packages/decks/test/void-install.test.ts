import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { installVoidDependencies } from "../src/node/install-void";
import { runHonoDecksCli } from "../src/node/cli";
import { initializeVite } from "../src/node/init-vite";

async function fixture(packageManager?: string) {
  const cwd = await mkdtemp(join(tmpdir(), "void-install-"));
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({
      type: "module",
      packageManager,
      dependencies: { "hono-decks": "file:local.tgz" },
      scripts: { dev: "vite", build: "vite build" },
    }),
  );
  await writeFile(join(cwd, "vite.config.ts"), "export default { plugins: [] };");
  for (const name of [
    "void",
    "vite",
    "hono",
    "hono-decks",
    "void-plugin-hono-jsx",
    "markdown-exit",
    "yaml",
    "markdown-it-container",
    "shiki",
    "@shikijs/transformers",
  ])
    await stub(cwd, name);
  return cwd;
}
async function stub(cwd: string, name: string) {
  const dir = join(cwd, "node_modules", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name, type: "module", exports: { ".": "./index.js", "./markdown/compiler": "./index.js" } }),
  );
  await writeFile(
    join(dir, "index.js"),
    "export function compileMarkdownModule() {} export function readMarkdownModule() {}",
  );
}

describe("Void dependency installation", () => {
  for (const [declaration, manager, flag] of [
    ["npm@11.0.0", "npm", "--ignore-scripts"],
    ["pnpm@10.0.0", "pnpm", "--ignore-scripts"],
    ["yarn@1.22.0", "yarn", "--ignore-scripts"],
    ["yarn@4.0.0", "yarn", "--mode=skip-build"],
    ["bun@1.3.0", "bun", "--ignore-scripts"],
  ]) {
    it(`installs only missing peers with ${declaration}`, async () => {
      const cwd = await fixture(declaration);
      try {
        await rm(join(cwd, "node_modules/markdown-exit"), { recursive: true, force: true });
        const calls: unknown[] = [];
        await installVoidDependencies(cwd, {
          run: async (command, args, path) => {
            calls.push([command, args, path]);
            expect(command).toBe(manager);
            expect(args).toContain(flag);
            expect(args.at(-1)).toBe("markdown-exit@^1.3.0");
            expect(args).not.toContain("hono@^4.13.13");
            await stub(cwd, "markdown-exit");
          },
        });
        expect(calls).toHaveLength(1);
        await installVoidDependencies(cwd, {
          run: async () => {
            throw new Error("must not reinstall");
          },
        });
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }

  it("detects lockfiles and rejects ambiguous or unsupported managers before installing", async () => {
    const cwd = await fixture();
    try {
      await writeFile(join(cwd, "pnpm-lock.yaml"), "");
      await installVoidDependencies(cwd, {
        adapter: "adapter.tgz",
        run: async (command, args) => {
          expect(command).toBe("pnpm");
          expect(args.at(-1)).toBe("adapter.tgz");
        },
      });
      await writeFile(join(cwd, "yarn.lock"), "");
      await expect(installVoidDependencies(cwd)).rejects.toThrow("Multiple package-manager");
      await writeFile(join(cwd, "package.json"), JSON.stringify({ packageManager: "unknown@1" }));
      await expect(installVoidDependencies(cwd)).rejects.toThrow("Unsupported packageManager");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects incompatible installed peers and invalid adapter flags before package changes", async () => {
    const cwd = await fixture();
    try {
      await expect(installVoidDependencies(cwd, { adapter: "--global" })).rejects.toThrow("package specifier");
      const path = join(cwd, "node_modules/hono/package.json");
      const pkg = JSON.parse(await readFile(path, "utf8"));
      await writeFile(path, JSON.stringify({ ...pkg, version: "3.0.0" }));
      await expect(
        installVoidDependencies(cwd, {
          run: async () => {
            throw new Error("must not install");
          },
        }),
      ).rejects.toThrow("incompatible");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects unsupported CLI flag combinations and missing compiler APIs", async () => {
    const cwd = await fixture();
    try {
      for (const flags of [
        ["--install"],
        ["--framework", "hono", "--install"],
        ["--framework", "void", "--adapter", "next"],
      ]) {
        expect((await runHonoDecksCli({ cwd, argv: ["init", ...flags] })).exitCode).toBe(1);
      }
      await writeFile(join(cwd, "node_modules/void-plugin-hono-jsx/index.js"), "export {};");
      await expect(installVoidDependencies(cwd)).rejects.toThrow("module compiler API");
      expect(await readFile(join(cwd, "hono-decks.config.ts"), "utf8").catch(() => null)).toBe(null);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("preflights conflicts before installation and leaves integration files absent on install failure", async () => {
    const cwd = await fixture();
    try {
      const config = await readFile(join(cwd, "vite.config.ts"), "utf8");
      await mkdir(join(cwd, "src"));
      await writeFile(join(cwd, "src/decks.ts"), "owned");
      let called = false;
      await expect(
        initializeVite(cwd, "void", undefined, undefined, {
          run: async () => {
            called = true;
          },
        }),
      ).rejects.toThrow("Refusing to overwrite");
      expect(called).toBe(false);
      await rm(join(cwd, "src/decks.ts"), { force: true });
      await expect(
        initializeVite(cwd, "void", undefined, undefined, {
          adapter: "adapter.tgz",
          run: async () => {
            throw new Error("network failed");
          },
        }),
      ).rejects.toThrow("network failed");
      expect(await readFile(join(cwd, "hono-decks.config.ts"), "utf8").catch(() => null)).toBe(null);
      expect(await readFile(join(cwd, "vite.config.ts"), "utf8")).toBe(config);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
