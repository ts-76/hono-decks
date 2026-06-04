import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDeckManifestFromFileSystem, writeDeckManifestModule } from "../src/node";

describe("Node filesystem deck adapter", () => {
  it("discovers deck files, compiles decks, and maps local assets", async () => {
    const cwd = await createFixture();

    try {
      const manifest = await buildDeckManifestFromFileSystem({
        cwd,
        root: "decks",
        mountPath: "/slides",
      });

      expect(manifest.decks).toHaveLength(2);
      expect(manifest.decks[0]).toMatchObject({
        slug: "deck1",
        sourcePath: "decks/deck1/deck.mdx",
        kind: "directory",
        meta: { title: "Deck One" },
      });
      expect(manifest.decks[0].assets[0]).toMatchObject({
        sourcePath: "decks/deck1/assets/my image#1.svg",
        publicPath: "/slides/deck1/assets/my%20image%231.svg",
        contentType: "image/svg+xml",
      });
      expect(manifest.decks[1]).toMatchObject({
        slug: "deck2",
        sourcePath: "decks/deck2.mdx",
        kind: "single-file",
        meta: { title: "Deck Two" },
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("writes a generated manifest module", async () => {
    const cwd = await createFixture();

    try {
      const manifest = await buildDeckManifestFromFileSystem({ cwd, root: "decks", mountPath: "/slides" });
      const outFile = join(cwd, "src", "generated", "hono-slides-manifest.ts");

      await writeDeckManifestModule({ manifest, outFile });

      const output = await readFile(outFile, "utf8");
      expect(output).toContain('import type { DeckManifest } from "hono-slides";');
      expect(output).toContain("export const deckManifest =");
      expect(output).toContain('"slug": "deck1"');
      expect(output).not.toContain("body");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("can import the node adapter through the package subpath", async () => {
    const mod = await import("hono-slides/node");

    expect(typeof mod.buildDeckManifestFromFileSystem).toBe("function");
    expect(typeof mod.writeDeckManifestModule).toBe("function");
  });

  it("rejects roots that escape the current working directory", async () => {
    const cwd = await createFixture();
    await mkdir(join(cwd, "..", "hono-slides-outside"), { recursive: true });
    await writeFile(join(cwd, "..", "hono-slides-outside", "deck.mdx"), "# Outside", "utf8");

    try {
      await expect(
        buildDeckManifestFromFileSystem({
          cwd,
          root: "../hono-slides-outside",
        }),
      ).rejects.toThrow("Deck root must be a relative path inside the current working directory");
    } finally {
      await rm(cwd, { recursive: true, force: true });
      await rm(join(cwd, "..", "hono-slides-outside"), { recursive: true, force: true });
    }
  });
});

async function createFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-slides-"));
  await mkdir(join(cwd, "decks", "deck1", "assets"), { recursive: true });
  await mkdir(join(cwd, "src", "generated"), { recursive: true });
  await writeFile(
    join(cwd, "decks", "deck1", "deck.mdx"),
    `---
title: Deck One
---

# Deck One`,
    "utf8",
  );
  await writeFile(join(cwd, "decks", "deck1", "assets", "my image#1.svg"), new Uint8Array([1, 2, 3]));
  await writeFile(
    join(cwd, "decks", "deck2.mdx"),
    `---
title: Deck Two
---

# Deck Two`,
    "utf8",
  );
  return cwd;
}
