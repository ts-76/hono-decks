import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(import.meta.dirname, "..", "src");

describe("source directory structure", () => {
  it("keeps deck as the domain model category and separates parser renderer generator source and routing", async () => {
    await expect(readdir(join(srcRoot, "parser"))).resolves.toContain("parser.ts");
    await expect(readdir(join(srcRoot, "renderer"))).resolves.toEqual(
      expect.arrayContaining(["compiled-render.ts", "render-block.ts", "render.ts"]),
    );
    await expect(readdir(join(srcRoot, "compiler"))).resolves.toContain("compiler.ts");
    await expect(readdir(join(srcRoot, "generator"))).resolves.toContain("manifest-generator.ts");
    await expect(readdir(join(srcRoot, "source"))).resolves.toContain("manifest-source.ts");
    await expect(readdir(join(srcRoot, "routing"))).resolves.toContain("file-routing.ts");

    await expect(readdir(join(srcRoot, "deck"))).resolves.toEqual(["model.ts"]);
  });
});
