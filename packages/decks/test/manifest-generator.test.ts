import { describe, expect, it } from "vitest";
import { buildDeckManifest, emitDeckManifestModule } from "../src/generator/manifest-generator";

describe("buildDeckManifest", () => {
  it("builds a compiled manifest from directory and single-file deck entries", async () => {
    const files = new Map<string, string | Uint8Array>([
      [
        "decks/deck1/deck.mdx",
        `---
title: Deck One
---

# Deck One

![Remote](https://cdn.example.com/deck-one.png)`,
      ],
      ["decks/deck1/assets/image.png", new Uint8Array([1, 2, 3])],
      [
        "decks/deck2.mdx",
        `---
title: Deck Two
---

# Deck Two`,
      ],
    ]);

    const manifest = await buildDeckManifest({
      root: "decks",
      paths: [...files.keys()],
      readText: async (path) => {
        const value = files.get(path);
        if (typeof value !== "string") throw new Error(`Expected text for ${path}`);
        return value;
      },
      readBinary: async (path) => {
        const value = files.get(path);
        if (!(value instanceof Uint8Array)) throw new Error(`Expected binary for ${path}`);
        return value;
      },
      mountPath: "/decks",
    });

    expect(manifest.decks).toHaveLength(2);
    expect(manifest.decks[0]).toMatchObject({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      meta: { title: "Deck One" },
    });
    expect(manifest.decks[0].assets).toEqual([
      {
        sourcePath: "decks/deck1/assets/image.png",
        publicPath: "/decks/deck1/assets/image.png",
        type: "local",
        contentType: "image/png",
        body: new Uint8Array([1, 2, 3]),
      },
      {
        sourcePath: "https://cdn.example.com/deck-one.png",
        publicPath: "https://cdn.example.com/deck-one.png",
        type: "remote",
        contentType: "image/png",
      },
    ]);
    expect(manifest.decks[1]).toMatchObject({
      slug: "deck2",
      sourcePath: "decks/deck2.mdx",
      kind: "single-file",
      meta: { title: "Deck Two" },
      assets: [],
    });
  });

  it("encodes local asset URL segments relative to the deck assets directory", async () => {
    const files = new Map<string, string | Uint8Array>([
      ["content/assets/decks/deck1/deck.mdx", "# Deck One"],
      ["content/assets/decks/deck1/assets/charts/my chart#1.svg", new Uint8Array([1])],
    ]);

    const manifest = await buildDeckManifest({
      root: "content/assets/decks",
      paths: [...files.keys()],
      readText: async (path) => String(files.get(path)),
      readBinary: async (path) => files.get(path) as Uint8Array,
      mountPath: "/slides",
    });

    expect(manifest.decks[0].assets[0]).toMatchObject({
      sourcePath: "content/assets/decks/deck1/assets/charts/my chart#1.svg",
      publicPath: "/slides/deck1/assets/charts/my%20chart%231.svg",
      contentType: "image/svg+xml",
    });
  });

  it("propagates slug conflict errors from file resolution", async () => {
    await expect(
      buildDeckManifest({
        root: "decks",
        paths: ["decks/deck1.mdx", "decks/deck1/deck.mdx"],
        readText: async () => "# unused",
      }),
    ).rejects.toThrow('Deck slug conflict for "deck1": decks/deck1.mdx and decks/deck1/deck.mdx');
  });
});

describe("emitDeckManifestModule", () => {
  it("emits an importable TypeScript manifest module with local asset bytes", async () => {
    const manifest = await buildDeckManifest({
      root: "decks",
      paths: ["decks/deck1/deck.mdx", "decks/deck1/assets/image.png"],
      readText: async () => "# Deck One",
      readBinary: async () => new Uint8Array([1, 2, 3]),
      mountPath: "/decks",
    });

    const source = emitDeckManifestModule(manifest);

    expect(source).toContain('import type { DeckManifest } from "hono-decks";');
    expect(source).toContain("export const deckManifest =");
    expect(source).toContain("export const manifest = deckManifest;");
    expect(source).toContain('"slug": "deck1"');
    expect(source).toContain('"publicPath": "/decks/deck1/assets/image.png"');
    expect(source).toContain('"body": new Uint8Array([1, 2, 3])');
    expect(source).toContain("satisfies DeckManifest;");
  });
});

it("exports manifest generation helpers from the public module", async () => {
  const mod = await import("../src/node");
  expect(typeof mod.buildDeckManifest).toBe("function");
  expect(typeof mod.emitDeckManifestModule).toBe("function");
});
