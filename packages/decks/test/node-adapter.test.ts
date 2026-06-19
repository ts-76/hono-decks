import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DeckFileChange } from "../src/deck/model";
import {
  buildDeckManifestFromFileSystem,
  compileDecks,
  createLocalDeckIO,
  writeDeckManifestModule,
} from "../src/node/index";
import { manifestDeckSource } from "../src/source/manifest-source";

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
      const encodedAsset = manifest.decks[0].assets.find((asset) => asset.sourcePath === "decks/deck1/assets/my image#1.svg");
      expect(encodedAsset).toMatchObject({
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
      const outFile = join(cwd, "src", "generated", "hono-decks-manifest.ts");

      await writeDeckManifestModule({ manifest, outFile });

      const output = await readFile(outFile, "utf8");
      expect(output).toContain('import type { DeckManifest } from "@hono/decks";');
      expect(output).toContain("export const deckManifest =");
      expect(output).toContain('"slug": "deck1"');
      expect(output).toContain('"body": new Uint8Array([1, 2, 3])');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("serves embedded local assets with content type and short-lived cache headers", async () => {
    const cwd = await createFixture();

    try {
      const manifest = await buildDeckManifestFromFileSystem({ cwd, root: "decks", mountPath: "/slides" });
      const source = manifestDeckSource(manifest);
      const response = await source.getAsset?.({} as never, "deck1", "jsx.svg");

      expect(response?.status).toBe(200);
      expect(response?.headers.get("content-type")).toContain("image/svg+xml");
      expect(response?.headers.get("cache-control")).toBe("public, max-age=300");
      expect(Array.from(new Uint8Array(await response!.arrayBuffer()))).toEqual([7, 8, 9]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("compiles local decks to generated router and slide modules", async () => {
    const cwd = await createFixture();

    try {
      await mkdir(join(cwd, "decks", "deck1", "components", "client"), { recursive: true });
      await writeFile(
        join(cwd, "decks", "deck1", "components", "index.tsx"),
        `export const Counter = {
  client: true,
  component() {
    return <button type="button">0</button>;
  },
};
`,
        "utf8",
      );
      await writeFile(
        join(cwd, "decks", "deck1", "components", "client", "index.tsx"),
        `/** @jsxImportSource hono/jsx/dom */
export function Counter() {
  return <button type="button">0</button>;
}
`,
        "utf8",
      );

      const manifest = await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      expect(manifest.decks.map((deck) => deck.slug)).toEqual(["deck1", "deck2"]);

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('import { decksClientEntry } from "./client-entry";');
      expect(output).toContain("export const decks = defineDecks({");
      expect(output).toContain("clientEntryAsset: decksClientEntry");
      expect(output).toContain('"publicPath": "/slides/deck1/assets/my%20image%231.svg"');
      expect(output).toContain('"publicPath": "/slides/deck1/assets/plain.svg"');
      expect(output).toContain('"body": new Uint8Array([1, 2, 3])');
      expect(output).toContain("withClientComponentIds(Components_deck1");
      expect(output).toMatch(/"Counter": "Counter__deck1_[a-z0-9]+"/);

      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "deck1", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain('from "hono/jsx/jsx-runtime"');
      expect(slideOutput).toContain('src: "/slides/deck1/assets/my%20image%231.svg"');
      expect(slideOutput).toContain('src: "/slides/deck1/assets/plain.svg"');
      expect(slideOutput).toContain('src: "/slides/deck1/assets/jsx.svg"');
      expect(slideOutput).toContain('src: "https://example.com/hono-decks-remote.png"');
      expect(slideOutput).not.toContain("./assets/jsx.svg");
      expect(slideOutput).not.toContain("/slides/deck1//slides/deck1/assets");

      const clientOutput = await readFile(join(cwd, "src", "generated", "client-entry.ts"), "utf8");
      expect(clientOutput).toContain("export const decksClientEntry =");
      expect(clientOutput).toContain("decks/deck1/components/client/index.tsx");
      expect(clientOutput).toContain("hydrateSlideIslands");
      expect(clientOutput).toMatch(/Counter__deck1_[a-z0-9]+/);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("can import the node adapter through the package subpath", async () => {
    const mod = await import("@hono/decks/node");

    expect(typeof mod.compileDecks).toBe("function");
    expect(typeof mod.createLocalDeckIO).toBe("function");
    expect(typeof mod.buildDeckManifestFromFileSystem).toBe("function");
    expect(typeof mod.createLocalDevSlidesApp).toBe("function");
    expect(typeof mod.writeDeckManifestModule).toBe("function");
  });

  it("rejects roots that escape the current working directory", async () => {
    const cwd = await createFixture();
    await mkdir(join(cwd, "..", "hono-decks-outside"), { recursive: true });
    await writeFile(join(cwd, "..", "hono-decks-outside", "deck.mdx"), "# Outside", "utf8");

    try {
      await expect(
        buildDeckManifestFromFileSystem({
          cwd,
          root: "../hono-decks-outside",
        }),
      ).rejects.toThrow("Deck root must be a relative path inside the current working directory");
    } finally {
      await rm(cwd, { recursive: true, force: true });
      await rm(join(cwd, "..", "hono-decks-outside"), { recursive: true, force: true });
    }
  });

  it("rejects output paths that escape the current working directory", async () => {
    const cwd = await createFixture();

    try {
      await expect(
        compileDecks({
          cwd,
          root: "decks",
          out: "../hono-decks-manifest.ts",
        }),
      ).rejects.toThrow("Output directory must be a relative path inside the current working directory");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("lists and reads raw markdown through LocalDeckIO", async () => {
    const cwd = await createFixture();
    const io = createLocalDeckIO({ cwd, root: "decks" });

    try {
      await expect(io.listFiles()).resolves.toEqual([
        {
          slug: "deck1",
          sourcePath: "decks/deck1/deck.mdx",
          kind: "directory",
        },
        {
          slug: "deck2",
          sourcePath: "decks/deck2.mdx",
          kind: "single-file",
        },
      ]);

      await expect(io.readMarkdown("deck1")).resolves.toContain("title: Deck One");
      await expect(io.readMarkdown("missing")).resolves.toBeNull();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("reads local deck assets through LocalDeckIO", async () => {
    const cwd = await createFixture();
    const io = createLocalDeckIO({ cwd, root: "decks" });

    try {
      expect(typeof io.readAsset).toBe("function");

      const body = await io.readAsset?.("decks/deck1/assets/my image#1.svg");
      expect(Array.from(body as Uint8Array)).toEqual([1, 2, 3]);
      await expect(io.readAsset?.("../outside.png")).rejects.toThrow(
        "Asset path must be a relative path inside the current working directory",
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("emits raw file change events through LocalDeckIO.watch", () => {
    let listener: ((eventType: "rename" | "change", filename: string | null) => void) | undefined;
    let closed = false;
    const io = createLocalDeckIO({
      cwd: "/workspace",
      root: "decks",
      pathExists: () => true,
      watchFileSystem: (_rootDir, _options, next) => {
        listener = next;
        return {
          close() {
            closed = true;
          },
        };
      },
    });

    expect(typeof io.watch).toBe("function");

    const events: DeckFileChange[] = [];
    const unwatch = io.watch!((event) => events.push(event));
    listener?.("change", "deck1/deck.mdx");
    unwatch();

    expect(events).toEqual([
      {
        type: "changed",
        path: "decks/deck1/deck.mdx",
        slug: "deck1",
      },
    ]);
    expect(closed).toBe(true);
  });

  it("maps directory deck asset watch events back to their deck slug", () => {
    let listener: ((eventType: "rename" | "change", filename: string | null) => void) | undefined;
    const io = createLocalDeckIO({
      cwd: "/workspace",
      root: "decks",
      pathExists: () => true,
      watchFileSystem: (_rootDir, _options, next) => {
        listener = next;
        return { close() {} };
      },
    });
    const events: DeckFileChange[] = [];
    const unwatch = io.watch!((event) => events.push(event));

    listener?.("rename", "deck1/assets/image.png");
    unwatch();

    expect(events).toEqual([
      {
        type: "created",
        path: "decks/deck1/assets/image.png",
        slug: "deck1",
      },
    ]);
  });

  it("does not assign a slug to the assets directory itself", () => {
    let listener: ((eventType: "rename" | "change", filename: string | null) => void) | undefined;
    const io = createLocalDeckIO({
      cwd: "/workspace",
      root: "decks",
      pathExists: () => true,
      watchFileSystem: (_rootDir, _options, next) => {
        listener = next;
        return { close() {} };
      },
    });
    const events: DeckFileChange[] = [];
    const unwatch = io.watch!((event) => events.push(event));

    listener?.("rename", "deck1/assets");
    unwatch();

    expect(events).toEqual([
      {
        type: "created",
        path: "decks/deck1/assets",
        slug: undefined,
      },
    ]);
  });
});

async function createFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-decks-"));
  await mkdir(join(cwd, "decks", "deck1", "assets"), { recursive: true });
  await mkdir(join(cwd, "src", "generated"), { recursive: true });
  await writeFile(
    join(cwd, "decks", "deck1", "deck.mdx"),
    `---
title: Deck One
---

# Deck One

![Diagram](./assets/my image#1.svg)

![Plain](./assets/plain.svg)

<img src="./assets/jsx.svg" alt="Local JSX asset" />

<img src="https://example.com/hono-decks-remote.png" alt="Remote asset" />`,
    "utf8",
  );
  await writeFile(join(cwd, "decks", "deck1", "assets", "my image#1.svg"), new Uint8Array([1, 2, 3]));
  await writeFile(join(cwd, "decks", "deck1", "assets", "plain.svg"), new Uint8Array([4, 5, 6]));
  await writeFile(join(cwd, "decks", "deck1", "assets", "jsx.svg"), new Uint8Array([7, 8, 9]));
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
