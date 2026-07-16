import { describe, expect, it } from "vitest";
import { resolveDeckFiles } from "../src/routing/file-routing";

describe("resolveDeckFiles", () => {
  it("resolves directory decks and single-file decks", () => {
    expect(
      resolveDeckFiles([
        "decks/deck1/deck.mdx",
        "decks/deck1/assets/image.png",
        "decks/deck2.mdx",
      ]),
    ).toEqual([
      {
        slug: "deck1",
        sourcePath: "decks/deck1/deck.mdx",
        kind: "directory",
        assetPaths: ["decks/deck1/assets/image.png"],
      },
      {
        slug: "deck2",
        sourcePath: "decks/deck2.mdx",
        kind: "single-file",
        assetPaths: [],
      },
    ]);
  });

  it("throws when directory and single-file decks claim the same slug", () => {
    expect(() => resolveDeckFiles(["decks/deck1.mdx", "decks/deck1/deck.mdx"])).toThrow(
      'Deck slug conflict for "deck1": decks/deck1.mdx and decks/deck1/deck.mdx',
    );
  });

  it("rejects path traversal and nested deck slugs for the first slice", () => {
    expect(() => resolveDeckFiles(["decks/../bad.mdx"])).toThrow("Deck path escapes the root: decks/../bad.mdx");
    expect(() => resolveDeckFiles(["decks/team/deck1.mdx"])).toThrow(
      "Nested deck slugs are not supported in this slice: decks/team/deck1.mdx",
    );
  });
});
