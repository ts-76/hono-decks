import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");

describe("package build metadata", () => {
  it("publishes built ESM exports and a built CLI bin", async () => {
    const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      private?: boolean;
      exports: Record<string, unknown>;
      bin: Record<string, string>;
      files: string[];
      scripts: Record<string, string>;
    };

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
      "./node": {
        types: "./dist/node.d.ts",
        import: "./dist/node.js",
      },
      "./worker": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    });
    expect(packageJson.bin).toEqual({ "hono-slides": "./dist/bin.js" });
    expect(packageJson.files).toEqual(expect.arrayContaining(["dist", "README.md"]));
    expect(packageJson.scripts.build).toBe("tsup");
    expect(packageJson.scripts.prepack).toBe("bun run build");
  });

  it("builds the CLI bin with a Node shebang", async () => {
    const bin = await readFile(join(packageRoot, "dist", "bin.js"), "utf8");

    expect(bin.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(bin).toContain("runHonoSlidesCli");
  });
});
