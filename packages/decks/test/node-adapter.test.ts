import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckFileChange } from "../src/deck/model";
import {
  buildDeckManifestFromFileSystem,
  compileDecks,
  createLocalDeckIO,
  writeDeckManifestModule,
} from "../src/node/index";
import { resolveOgpMetadata } from "../src/node/ogp";
import { manifestDeckSource } from "../src/source/manifest-source";

describe("Node filesystem deck adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
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

  it("does not fetch OGP metadata from localhost link cards", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const metadata = await resolveOgpMetadata("http://127.0.0.1/internal");

    expect(metadata).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not follow OGP redirects to private network hosts", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const metadata = await resolveOgpMetadata("http://93.184.216.34/card");

    expect(metadata).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
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
      expect(slideOutput).toContain("highlightedHtml");
      expect(slideOutput).toContain("shiki");
      expect(slideOutput).toContain("github-dark");
      expect(slideOutput).not.toContain('from "shiki"');
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

  it("embeds deck-local theme.css into generated directory decks", async () => {
    const cwd = await createFixture();

    try {
      await writeFile(
        join(cwd, "decks", "deck1", "theme.css"),
        `.layout-cover { background: #101827; }\n:root { --hono-decks-accent-color: #38bdf8; }\n`,
        "utf8",
      );

      const manifest = await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      expect(manifest.decks[0].themeSourcePath).toBe("decks/deck1/theme.css");
      expect(manifest.decks[0].themeStyle).toContain(".layout-cover { background: #101827; }");
      expect(manifest.decks[1].themeStyle).toBeUndefined();

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('"themeSourcePath": "decks/deck1/theme.css"');
      expect(output).toContain(".layout-cover { background: #101827; }");
      expect(output).toContain("--hono-decks-accent-color: #38bdf8");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("embeds deck-local styles/index.css into generated directory decks", async () => {
    const cwd = await createFixture();

    try {
      await mkdir(join(cwd, "decks", "deck1", "styles"), { recursive: true });
      await writeFile(
        join(cwd, "decks", "deck1", "styles", "index.css"),
        `.layout-default { background: white; color: black; }\n`,
        "utf8",
      );

      const manifest = await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      expect(manifest.decks[0].themeSourcePath).toBe("decks/deck1/styles/index.css");
      expect(manifest.decks[0].themeStyle).toContain(".layout-default { background: white; color: black; }");

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('"themeSourcePath": "decks/deck1/styles/index.css"');
      expect(output).toContain(".layout-default { background: white; color: black; }");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects directory decks with both theme.css and styles/index.css", async () => {
    const cwd = await createFixture();

    try {
      await mkdir(join(cwd, "decks", "deck1", "styles"), { recursive: true });
      await writeFile(join(cwd, "decks", "deck1", "theme.css"), ".slide { color: red; }\n", "utf8");
      await writeFile(join(cwd, "decks", "deck1", "styles", "index.css"), ".slide { color: blue; }\n", "utf8");

      await expect(
        compileDecks({
          cwd,
          root: "decks",
          out: "src/generated",
          mountPath: "/slides",
        }),
      ).rejects.toThrow(
        "Deck deck1 has both decks/deck1/theme.css and decks/deck1/styles/index.css. Use only one theme CSS entry.",
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("warns and falls back for unknown slide dynamics frontmatter in generated decks", async () => {
    const cwd = await createFixture();

    try {
      await writeFile(
        join(cwd, "decks", "deck1", "deck.mdx"),
        `---
title: Deck One
---

---
title: Invalid Dynamics
transition: spin
fragments: magic
---

# Invalid Dynamics
`,
        "utf8",
      );

      const manifest = await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      expect(manifest.decks[0].slides[0].meta.transition).toBe("none");
      expect(manifest.decks[0].slides[0].meta.fragments).toBe("none");
      expect(manifest.decks[0].warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unknown-transition",
            slideIndex: 0,
          }),
          expect.objectContaining({
            code: "unknown-fragments",
            slideIndex: 0,
          }),
        ]),
      );

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('"transition": "none"');
      expect(output).toContain('"fragments": "none"');
      expect(output).toContain('"code": "unknown-transition"');
      expect(output).toContain('"code": "unknown-fragments"');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("emits deck-level transition defaults into generated decks", async () => {
    const cwd = await createFixture();

    try {
      await writeFile(
        join(cwd, "decks", "deck1", "deck.mdx"),
        `---
title: Deck One
transition: slide-left
---

# Uses deck default

---
title: Override
transition: slide-up
---

## Override
`,
        "utf8",
      );

      const manifest = await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      expect(manifest.decks[0].meta.transition).toBe("slide-left");
      expect(manifest.decks[0].slides[0].meta.transition).toBe("slide-left");
      expect(manifest.decks[0].slides[1].meta.transition).toBe("slide-up");

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('"transition": "slide-left"');
      expect(output).toContain('"transition": "slide-up"');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("marks top-level list items as fragments when slide frontmatter uses fragments list", async () => {
    const cwd = await createFixture();

    try {
      await writeFile(
        join(cwd, "decks", "deck1", "deck.mdx"),
        `---
title: Deck One
---

---
title: Reveal List
fragments: list
---

- First reveal
- Second reveal
`,
        "utf8",
      );

      await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
      });

      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "deck1", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain("data-hono-decks-fragment");
      expect(slideOutput).toContain("data-fragment-order");
      expect(slideOutput).toContain("First reveal");
      expect(slideOutput).toContain("Second reveal");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("compiles Zenn-style embeds and fire reveal authoring syntax", async () => {
    const cwd = await createFixture();

    try {
      await mkdir(join(cwd, "decks", "deck1", "components"), { recursive: true });
      await writeFile(
        join(cwd, "decks", "deck1", "components", "index.tsx"),
        `/** @jsxImportSource hono/jsx */
export function Badge(props: { children?: unknown }) {
  return <strong class="badge">{props.children}</strong>;
}
`,
        "utf8",
      );
      await writeFile(
        join(cwd, "decks", "deck1", "deck.mdx"),
        `---
title: Deck One
---

---
title: Syntax
---

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

@[x](https://x.com/honojs/status/1659577874821836801?s=20)

@[card](https://hono.dev/docs/)

@[embed](https://example.com/embed/status)

@[iframe](https://example.com/embed/dashboard)

https://example.com/plain-link

:::fire
Markdown reveal
:::

<Badge $fire={2} effect="fade-up">JSX reveal</Badge>

The slide stays 16:9.
`,
        "utf8",
      );

      await compileDecks({
        cwd,
        root: "decks",
        out: "src/generated",
        mountPath: "/slides",
        resolveOgp: async (url) =>
          url === "https://hono.dev/docs/"
            ? {
                title: "Hono Documentation",
                description: "Fast, lightweight web framework docs.",
                image: "https://hono.dev/og.png",
                siteName: "Hono",
              }
            : undefined,
      });

      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "deck1", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain("EmbedFrame");
      expect(slideOutput).toContain('provider: "youtube"');
      expect(slideOutput).toContain('src: "https://www.youtube.com/embed/dQw4w9WgXcQ"');
      expect(slideOutput).toContain('fallbackHref: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
      expect(slideOutput).toContain("TweetEmbed");
      expect(slideOutput).toContain('href: "https://x.com/honojs/status/1659577874821836801?s=20"');
      expect(slideOutput).not.toContain("SocialEmbed");
      expect(slideOutput).toContain("LinkCard");
      expect(slideOutput).toContain('href: "https://hono.dev/docs/"');
      expect(slideOutput).toContain('title: "Hono Documentation"');
      expect(slideOutput).toContain('description: "Fast, lightweight web framework docs."');
      expect(slideOutput).toContain('image: "https://hono.dev/og.png"');
      expect(slideOutput).toContain('siteName: "Hono"');
      expect(slideOutput).toContain('src: "https://example.com/embed/status"');
      expect(slideOutput).toContain('title: "Embedded content"');
      expect(slideOutput).toContain('src: "https://example.com/embed/dashboard"');
      expect(slideOutput).toContain('href: "https://example.com/plain-link"');
      expect(slideOutput).toContain('children: "https://example.com/plain-link"');
      expect(slideOutput).toContain("Fragment");
      expect(slideOutput).toContain("Markdown reveal");
      expect(slideOutput).toContain("JSX reveal");
      expect(slideOutput).toContain("16");
      expect(slideOutput).toContain(":9");
      expect(slideOutput).toContain('order: "2"');
      expect(slideOutput).toContain('effect: "fade-up"');
      expect(slideOutput).not.toContain("$fire");
      expect(slideOutput).not.toContain("_components.div");
      expect(slideOutput.match(/_jsx\(LinkCard/g)?.length).toBe(1);
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

<img src="https://example.com/hono-decks-remote.png" alt="Remote asset" />

\`\`\`ts
const answer = 42
\`\`\``,
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
