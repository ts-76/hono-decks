import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import { compileDecks } from "../src/node/compile-decks";
import type { CompileDecksResult } from "../src/node/compile-decks";
import type { DeckManifest } from "../src/deck/model";
import { publishGeneratedFiles } from "../src/node/file-transaction";

async function snapshot(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { withFileTypes: true });
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.isDirectory()) {
      for (const [path, text] of Object.entries(await snapshot(join(root, entry.name))))
        result[`${entry.name}/${path}`] = text;
    } else result[entry.name] = await readFile(join(root, entry.name), "utf8");
  }
  return result;
}

describe("generated build consistency", () => {
  it("returns build information with module paths, distinct from a renderable manifest", async () => {
    expectTypeOf<CompileDecksResult>().not.toMatchTypeOf<DeckManifest>();
    const cwd = await mkdtemp(join(tmpdir(), "decks-build-result-"));
    try {
      await mkdir(join(cwd, "decks"));
      await writeFile(join(cwd, "decks/demo.mdx"), "# Expected body");
      const result = await compileDecks({ cwd, root: "decks", out: "generated" });
      expect(result.routerModulePath).toBe("generated/decks.ts");
      expect(result.decks[0].slides[0]).toEqual({
        index: 0,
        meta: expect.objectContaining({ title: "Expected body" }),
        notes: undefined,
        modulePath: "generated/decks/demo/slide-0.ts",
      });
      expect(result.decks[0].slides[0]).not.toHaveProperty("html");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("preserves the entire last successful output and OGP cache when client bundling fails", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "decks-build-failure-"));
    try {
      await mkdir(join(cwd, "decks/demo/components/client"), { recursive: true });
      const source = join(cwd, "decks/demo/deck.mdx");
      await writeFile(source, "# Before");
      await writeFile(join(cwd, "decks/cache.json"), "{}\n");
      const input = { cwd, root: "decks", out: "generated", ogpCacheFile: "decks/cache.json" };
      await compileDecks(input);
      await writeFile(join(cwd, "generated/owned.txt"), "Keep application file");
      const before = await snapshot(join(cwd, "generated"));
      await writeFile(source, "# After\n\n@[card](https://example.com/)");
      await writeFile(join(cwd, "decks/demo/components/client/index.tsx"), "export const Counter = ;");
      await expect(
        compileDecks({ ...input, refreshOgp: true, resolveOgp: async () => ({ title: "Fresh card" }) }),
      ).rejects.toThrow();
      expect(await snapshot(join(cwd, "generated"))).toEqual(before);
      expect(await readFile(join(cwd, "decks/cache.json"), "utf8")).toBe("{}\n");
      await writeFile(join(cwd, "decks/demo/components/client/index.tsx"), "export const lowerCase = 1;");
      await compileDecks({ ...input, refreshOgp: true, resolveOgp: async () => ({ title: "Fresh card" }) });
      expect(await readFile(join(cwd, "generated/decks/demo/slide-0.ts"), "utf8")).toContain("After");
      expect(await readFile(join(cwd, "decks/cache.json"), "utf8")).toContain("Fresh card");
      expect(await readFile(join(cwd, "generated/owned.txt"), "utf8")).toBe("Keep application file");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rolls back overwritten and newly created files when publication fails", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "decks-publish-failure-"));
    try {
      const existing = join(cwd, "existing.ts");
      const added = join(cwd, "added.ts");
      const cache = join(cwd, "cache.json");
      await writeFile(existing, "Before");
      await writeFile(cache, "Old cache");
      await expect(
        publishGeneratedFiles(
          [
            { path: existing, content: "After" },
            { path: added, content: "New file" },
            { path: cache, content: "New cache" },
          ],
          async (from, to) => {
            if (to === cache && String(from).endsWith("next")) throw new Error("Injected filesystem failure");
            await rename(from, to);
          },
        ),
      ).rejects.toThrow("Injected filesystem failure");
      expect(await snapshot(cwd)).toEqual({ "existing.ts": "Before", "cache.json": "Old cache" });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("leaves output unchanged when staging finds an unwritable output target", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "decks-stage-failure-"));
    try {
      const existing = join(cwd, "existing.ts");
      const blocked = join(cwd, "blocked");
      await writeFile(existing, "Before");
      await mkdir(blocked);
      await expect(
        publishGeneratedFiles([
          { path: existing, content: "After" },
          { path: blocked, content: "Cannot replace directory" },
        ]),
      ).rejects.toThrow();
      expect(await snapshot(cwd)).toEqual({ "existing.ts": "Before" });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("renders distinct decks and component registries even when slug spellings normalize identically", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "decks-identifier-collision-"));
    try {
      const slugs = ["a-b", "a_b", "日本語一", "日本語二", "1", "2"];
      for (const [index, slug] of slugs.entries()) {
        await mkdir(join(cwd, "decks", slug, "components"), { recursive: true });
        const hasComponent = index === 0 || index === 3;
        await writeFile(join(cwd, "decks", slug, "deck.mdx"), `# Body ${index}\n\n${hasComponent ? "<Badge />" : ""}`);
        if (hasComponent)
          await writeFile(
            join(cwd, "decks", slug, "components/index.tsx"),
            `export function Badge() { return <p>Badge ${index}</p>; }`,
          );
      }
      await compileDecks({ cwd, root: "decks", out: "generated" });
      const bundled = await build({
        entryPoints: [join(cwd, "generated/decks.ts")],
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        jsx: "automatic",
        jsxImportSource: "hono/jsx",
        alias: { "hono-decks/advanced": fileURLToPath(new URL("../src/advanced.ts", import.meta.url)) },
        nodePaths: [fileURLToPath(new URL("../../../node_modules", import.meta.url))],
      });
      const module = await import(
        `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
      );
      const router = module.createDecks({ mountPath: "/slides" }).router();
      for (const [index, slug] of slugs.entries()) {
        const response = await router.request(`http://localhost/${encodeURIComponent(slug)}/render`);
        const html = await response.text();
        expect(response.status).toBe(200);
        expect(html).toContain(`Body ${index}`);
        if (index === 0 || index === 3) expect(html).toContain(`Badge ${index}`);
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
