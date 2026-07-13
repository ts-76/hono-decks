import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");

describe("package build metadata", () => {
  it("publishes built ESM exports and a built CLI bin", async () => {
    const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      name: string;
      private?: boolean;
      exports: Record<string, unknown>;
      bin: Record<string, string>;
      files: string[];
      scripts: Record<string, string>;
    };

    expect(packageJson.name).toBe("@hono/decks");
    expect(packageJson.private).toBeUndefined();
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/mod.d.ts",
        import: "./dist/mod.js",
      },
      "./cli": {
        types: "./dist/cli.d.ts",
        import: "./dist/cli.js",
      },
      "./client": {
        types: "./dist/client.d.ts",
        import: "./dist/client.js",
      },
      "./node": {
        types: "./dist/node.d.ts",
        import: "./dist/node.js",
      },
      "./worker": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
      "./runtime": {
        types: "./dist/runtime.d.ts",
        import: "./dist/runtime.js",
      },
    });
    expect(packageJson.bin).toEqual({ "hono-decks": "./dist/bin.js" });
    expect(packageJson.files).toEqual(expect.arrayContaining(["dist", "README.md"]));
    expect(packageJson.scripts.build).toBe("tsup");
    expect(packageJson.scripts.prepack).toBe("bun run build");
  });

  it("builds the CLI bin with a Node shebang", async () => {
    const bin = await readFile(join(packageRoot, "dist", "bin.js"), "utf8");

    expect(bin.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(bin).toContain("runHonoDecksCli");
  });

  it("keeps the runtime entry free from compiler-only dependencies", async () => {
    const runtime = await readFile(join(packageRoot, "dist", "runtime.js"), "utf8");

    expect(runtime).not.toContain("node_modules/unified/");
    expect(runtime).not.toContain("node_modules/remark-parse/");
    expect(runtime).not.toContain("node_modules/acorn-jsx/");
  });

  it("ships self-contained high-level API and embedding documentation", async () => {
    const readme = await readFile(join(packageRoot, "README.md"), "utf8");

    expect(readme.length).toBeGreaterThan(5_000);
    expect(readme).toContain("createDeckViewerEmbed()");
    expect(readme).toContain("同じdocumentへ複数配置");
    expect(readme).toContain("Embedding from an external blog");
    expect(readme).toContain("examples/minimal");
    expect(readme).toContain("examples/honox");
    expect(readme).toContain("frame-ancestors");
    expect(readme).toContain('allow="fullscreen"');
    expect(readme).toContain("iframe navigationにCORSは不要");
    expect(readme).toContain("defineDecksConfig<AppEnv>");
    expect(readme).toContain("mergeDecksRouterOptions");
    expect(readme).toContain("viewer.render");
    expect(readme).not.toContain("root `README.md` を参照");
  });
});
