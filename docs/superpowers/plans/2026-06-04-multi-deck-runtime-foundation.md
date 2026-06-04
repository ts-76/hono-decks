# Multi-deck Runtime Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production/runtime foundation for multiple compiled decks: slug resolution, compiled deck contracts, manifest-backed `DeckSource`, and mount-aware Hono presentation routing.

**Architecture:** This slice keeps runtime deterministic and Worker-compatible. It introduces compiled deck contracts and a Hono router that consumes a `DeckSource`; local filesystem I/O, dev save/hot reload, and Agent Code Mode editing are separate follow-up plans.

**Tech Stack:** TypeScript, Hono, Vitest, existing markdown parser/rendering utilities.

---

## Scope

This plan implements:

- Directory and single-file deck slug resolution from normalized file paths.
- Slug conflict errors for `deck1.mdx` plus `deck1/deck.mdx`.
- Runtime compiled deck contracts.
- A manifest-backed `DeckSource`.
- Rendering compiled slides through a production Hono router.
- Production route surface: index, deck page, deck assets, and no dev routes.

This plan does not implement:

- Node filesystem scanning.
- Writing `.mdx` files.
- Development editor, save API, preview events, or hot reload.
- Cloudflare Agent editing or Code Mode tools.
- Full MDX package compilation.

## File Structure

- Create `src/deck.ts`
  - Owns runtime contracts: `DeckSource`, `CompiledDeck`, `CompiledSlide`, `DeckEntry`, `AssetRef`, frontmatter types, compile warnings, and helper constructors.

- Create `src/file-routing.ts`
  - Owns pure slug resolution from path strings. It does not read the filesystem.

- Create `src/manifest-source.ts`
  - Wraps an in-memory compiled manifest as a `DeckSource`.

- Create `src/compiled-render.ts`
  - Renders `CompiledDeck` and `CompiledSlide` into presentation HTML.

- Create `src/router.ts`
  - Exposes `honoSlidesRouter(options)` and production-only routes for this slice.

- Modify `src/mod.ts`
  - Exports the new router, source, resolver, and runtime types.

- Add `test/file-routing.test.ts`
  - Verifies slug derivation and conflict handling.

- Add `test/manifest-source.test.ts`
  - Verifies `DeckSource` list/get/asset behavior.

- Add `test/router.test.ts`
  - Verifies production route surface and mount awareness.

---

### Task 1: Runtime Contracts

**Files:**
- Create: `src/deck.ts`
- Test: `test/manifest-source.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create `test/manifest-source.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { manifestDeckSource } from "../src/manifest-source";
import type { CompiledDeck } from "../src/deck";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: {
    title: "Deck One",
    tags: ["hono"],
    draft: false,
    meta: {},
  },
  slides: [
    {
      index: 0,
      meta: { title: "Intro", layout: "cover", meta: {} },
      html: "<h1>Intro</h1>",
      components: [],
    },
  ],
  assets: [
    {
      sourcePath: "decks/deck1/assets/image.png",
      publicPath: "/decks/deck1/assets/image.png",
      type: "local",
      contentType: "image/png",
      body: new Uint8Array([1, 2, 3]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;

describe("manifestDeckSource", () => {
  it("lists and loads compiled decks by slug", async () => {
    const source = manifestDeckSource({ decks: [deck] });

    await expect(source.listDecks({} as never)).resolves.toEqual([
      {
        slug: "deck1",
        title: "Deck One",
        description: undefined,
        draft: false,
        sourcePath: "decks/deck1/deck.mdx",
      },
    ]);

    await expect(source.getCompiledDeck({} as never, "deck1")).resolves.toEqual(deck);
    await expect(source.getCompiledDeck({} as never, "missing")).resolves.toBeNull();
  });

  it("serves manifest assets when the deck owns a local asset", async () => {
    const source = manifestDeckSource({ decks: [deck] });
    const response = await source.getAsset?.({} as never, "deck1", "image.png");

    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("image/png");
    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/manifest-source.test.ts`

Expected: FAIL with module resolution errors for `../src/manifest-source` and `../src/deck`.

- [ ] **Step 3: Add runtime contract types**

Create `src/deck.ts` with this content:

```ts
import type { Context } from "hono";

export type DeckKind = "directory" | "single-file";

export interface DeckFrontmatter {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  date?: string;
  theme?: string;
  draft?: boolean;
  assets?: string;
  presenter?: boolean;
  meta: Record<string, unknown>;
}

export interface SlideFrontmatter {
  title?: string;
  layout?: string;
  className?: string;
  notes?: string;
  background?: string;
  transition?: string;
  meta: Record<string, unknown>;
}

export interface ComponentPlaceholder {
  id: string;
  name: string;
  props: Record<string, unknown>;
  source: string;
}

export interface AssetRef {
  sourcePath: string;
  publicPath: string;
  type: "local" | "remote" | "r2" | "public";
  contentType?: string;
  body?: BodyInit;
}

export interface CompileWarning {
  code: string;
  message: string;
  slideIndex?: number;
}

export interface CompiledSlide {
  index: number;
  meta: SlideFrontmatter;
  html: string;
  components: ComponentPlaceholder[];
  notes?: string;
}

export interface CompiledDeck {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  meta: DeckFrontmatter;
  slides: CompiledSlide[];
  assets: AssetRef[];
  warnings: CompileWarning[];
}

export interface DeckEntry {
  slug: string;
  title?: string;
  description?: string;
  draft?: boolean;
  sourcePath: string;
}

export interface DeckSource {
  listDecks(c: Context): Promise<DeckEntry[]>;
  getCompiledDeck(c: Context, slug: string): Promise<CompiledDeck | null>;
  getAsset?(c: Context, slug: string, assetPath: string): Promise<Response | null>;
}

export interface DeckManifest {
  decks: CompiledDeck[];
}
```

- [ ] **Step 4: Add the manifest-backed source**

Create `src/manifest-source.ts` with this content:

```ts
import type { Context } from "hono";
import type { AssetRef, CompiledDeck, DeckEntry, DeckManifest, DeckSource } from "./deck";

export function manifestDeckSource(manifest: DeckManifest): DeckSource {
  const decks = new Map(manifest.decks.map((deck) => [deck.slug, deck]));

  return {
    async listDecks(_c: Context): Promise<DeckEntry[]> {
      return manifest.decks.map((deck) => ({
        slug: deck.slug,
        title: deck.meta.title,
        description: deck.meta.description,
        draft: deck.meta.draft,
        sourcePath: deck.sourcePath,
      }));
    },

    async getCompiledDeck(_c: Context, slug: string): Promise<CompiledDeck | null> {
      return decks.get(slug) ?? null;
    },

    async getAsset(_c: Context, slug: string, assetPath: string): Promise<Response | null> {
      const deck = decks.get(slug);
      if (!deck) return null;

      const asset = findLocalAsset(deck.assets, slug, assetPath);
      if (!asset || asset.body == null) return null;

      return new Response(asset.body, {
        headers: asset.contentType ? { "content-type": asset.contentType } : undefined,
      });
    },
  };
}

function findLocalAsset(assets: AssetRef[], slug: string, assetPath: string): AssetRef | undefined {
  const normalized = assetPath.replace(/^\/+/, "");
  return assets.find((asset) => {
    if (asset.type !== "local") return false;
    const suffix = `/${slug}/assets/${normalized}`;
    return asset.publicPath.endsWith(suffix);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- test/manifest-source.test.ts`

Expected: PASS for both manifest source tests.

- [ ] **Step 6: Commit**

```bash
git add src/deck.ts src/manifest-source.ts test/manifest-source.test.ts
git commit -m "Add compiled deck source contract"
```

---

### Task 2: File-based Slug Resolution

**Files:**
- Create: `src/file-routing.ts`
- Test: `test/file-routing.test.ts`

- [ ] **Step 1: Write the failing slug resolution tests**

Create `test/file-routing.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { resolveDeckFiles } from "../src/file-routing";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/file-routing.test.ts`

Expected: FAIL with module resolution error for `../src/file-routing`.

- [ ] **Step 3: Implement pure file path resolution**

Create `src/file-routing.ts` with this content:

```ts
import type { DeckKind } from "./deck";

export interface ResolvedDeckFile {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  assetPaths: string[];
}

export function resolveDeckFiles(paths: string[], root = "decks"): ResolvedDeckFile[] {
  const normalizedRoot = normalizePath(root).replace(/\/$/, "");
  const decks = new Map<string, ResolvedDeckFile>();
  const assetsBySlug = new Map<string, string[]>();

  for (const inputPath of paths.map(normalizePath).sort()) {
    assertInsideRoot(inputPath, normalizedRoot);

    const relative = inputPath.slice(normalizedRoot.length + 1);
    const segments = relative.split("/");

    if (segments.length === 1 && segments[0].endsWith(".mdx")) {
      const slug = segments[0].replace(/\.mdx$/, "");
      addDeck(decks, {
        slug,
        sourcePath: inputPath,
        kind: "single-file",
        assetPaths: [],
      });
      continue;
    }

    if (segments.length === 2 && segments[1] === "deck.mdx") {
      addDeck(decks, {
        slug: segments[0],
        sourcePath: inputPath,
        kind: "directory",
        assetPaths: assetsBySlug.get(segments[0]) ?? [],
      });
      continue;
    }

    if (segments.length >= 3 && segments[1] === "assets") {
      const slug = segments[0];
      const assetPaths = assetsBySlug.get(slug) ?? [];
      assetPaths.push(inputPath);
      assetsBySlug.set(slug, assetPaths);

      const deck = decks.get(slug);
      if (deck?.kind === "directory") deck.assetPaths = assetPaths;
      continue;
    }

    if (segments.length > 2 && inputPath.endsWith(".mdx")) {
      throw new Error(`Nested deck slugs are not supported in this slice: ${inputPath}`);
    }
  }

  return [...decks.values()].map((deck) => ({
    ...deck,
    assetPaths: [...deck.assetPaths].sort(),
  }));
}

function addDeck(decks: Map<string, ResolvedDeckFile>, next: ResolvedDeckFile): void {
  const current = decks.get(next.slug);
  if (current) {
    throw new Error(`Deck slug conflict for "${next.slug}": ${current.sourcePath} and ${next.sourcePath}`);
  }
  decks.set(next.slug, next);
}

function assertInsideRoot(path: string, root: string): void {
  if (path.includes("/../") || path.endsWith("/..") || path.startsWith("../")) {
    throw new Error(`Deck path escapes the root: ${path}`);
  }

  if (path !== root && !path.startsWith(`${root}/`)) {
    throw new Error(`Deck path is outside ${root}: ${path}`);
  }
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/file-routing.test.ts`

Expected: PASS for all slug resolution tests.

- [ ] **Step 5: Commit**

```bash
git add src/file-routing.ts test/file-routing.test.ts
git commit -m "Resolve deck file slugs"
```

---

### Task 3: Compiled Deck Rendering

**Files:**
- Create: `src/compiled-render.ts`
- Test: `test/compiled-render.test.ts`

- [ ] **Step 1: Write the failing rendering tests**

Create `test/compiled-render.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { renderCompiledDeck, renderCompiledDeckPage } from "../src/compiled-render";
import type { CompiledDeck } from "../src/deck";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", presenter: true, meta: {} },
  slides: [
    {
      index: 0,
      meta: { title: "Intro", layout: "cover", className: "hero", notes: "Say hello", meta: {} },
      html: "<h1>Intro</h1>",
      components: [],
      notes: "Say hello",
    },
    {
      index: 1,
      meta: { title: "Details", layout: "default", meta: {} },
      html: "<h2>Details</h2>",
      components: [],
    },
  ],
  assets: [],
  warnings: [{ code: "x-component", message: "Unsupported component" }],
} satisfies CompiledDeck;

describe("compiled deck rendering", () => {
  it("renders slides with stable presentation metadata", () => {
    const html = renderCompiledDeck(deck);

    expect(html).toContain('data-deck-slug="deck1"');
    expect(html).toContain('data-slide-index="0"');
    expect(html).toContain("layout-cover");
    expect(html).toContain("hero");
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain('class="speaker-notes" hidden');
    expect(html).toContain("Say hello");
  });

  it("renders a full page with presentation controls and warnings", () => {
    const html = renderCompiledDeckPage({ deck, mountPath: "/decks" });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Deck One</title>");
    expect(html).toContain('data-hono-slides-controls');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('data-action="presenter"');
    expect(html).toContain("Unsupported component");
    expect(html).not.toContain("/edit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/compiled-render.test.ts`

Expected: FAIL with module resolution error for `../src/compiled-render`.

- [ ] **Step 3: Implement compiled deck rendering**

Create `src/compiled-render.ts` with this content:

```ts
import type { CompiledDeck, CompiledSlide } from "./deck";

export function renderCompiledDeck(deck: CompiledDeck): string {
  return `<main class="hono-slides-deck" data-deck-slug="${escapeHtml(deck.slug)}">${deck.slides
    .map(renderCompiledSlide)
    .join("\n")}</main>`;
}

export function renderCompiledSlide(slide: CompiledSlide): string {
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml = notes ? `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}>${slide.html}${notesHtml}</section>`;
}

export function renderCompiledDeckPage(input: { deck: CompiledDeck; mountPath: string; style?: string }): string {
  const { deck } = input;
  const warnings = deck.warnings.length
    ? `<aside class="hono-slides-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(deck.meta.title ?? deck.slug)}</title>
  <style>${basePresentationStyle()}${input.style ?? ""}</style>
</head>
<body>
  ${warnings}
  ${renderCompiledDeck(deck)}
  ${renderPresentationControls(deck)}
</body>
</html>`;
}

function renderPresentationControls(deck: CompiledDeck): string {
  return `<nav class="hono-slides-controls" data-hono-slides-controls aria-label="Presentation controls">
    <button type="button" data-action="previous" aria-label="Previous slide">Prev</button>
    <span data-slide-position>1 / ${deck.slides.length}</span>
    <button type="button" data-action="next" aria-label="Next slide">Next</button>
    <button type="button" data-action="fullscreen" aria-label="Fullscreen">Full</button>
    <button type="button" data-action="presenter" aria-label="Presenter mode">Presenter</button>
    <button type="button" data-action="overview" aria-label="Overview">Overview</button>
    <span data-timer>00:00</span>
  </nav>`;
}

function basePresentationStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#eef2ff}
body{margin:0}
.hono-slides-deck{display:grid;gap:1rem;padding:1rem}
.slide{aspect-ratio:16/9;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:clamp(1.2rem,3vw,3rem);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));overflow:hidden}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.hono-slides-controls{position:sticky;bottom:0;display:flex;gap:.5rem;align-items:center;padding:.75rem;background:rgba(11,16,32,.92);backdrop-filter:blur(12px)}
.hono-slides-controls button{border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.08);color:inherit;padding:.45rem .7rem}
.hono-slides-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/compiled-render.test.ts`

Expected: PASS for both compiled rendering tests.

- [ ] **Step 5: Commit**

```bash
git add src/compiled-render.ts test/compiled-render.test.ts
git commit -m "Render compiled slide decks"
```

---

### Task 4: Production Hono Router

**Files:**
- Create: `src/router.ts`
- Test: `test/router.test.ts`

- [ ] **Step 1: Write failing router tests**

Create `test/router.test.ts` with this content:

```ts
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck";
import { manifestDeckSource } from "../src/manifest-source";
import { honoSlidesRouter } from "../src/router";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", draft: false, meta: {} },
  slides: [{ index: 0, meta: { title: "Intro", layout: "cover", meta: {} }, html: "<h1>Intro</h1>", components: [] }],
  assets: [
    {
      sourcePath: "decks/deck1/assets/image.png",
      publicPath: "/decks/deck1/assets/image.png",
      type: "local",
      contentType: "image/png",
      body: new Uint8Array([9, 8, 7]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;

describe("honoSlidesRouter", () => {
  it("serves an index and a compiled deck under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("<h1>Intro</h1>");
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Deck not found", slug: "missing" });
  });

  it("does not expose development routes when dev is false", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    expect((await app.request("/decks/deck1/edit")).status).toBe(404);
    expect((await app.request("/decks/deck1/events")).status).toBe(404);
    expect((await app.request("/decks/deck1/save", { method: "POST" })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/router.test.ts`

Expected: FAIL with module resolution error for `../src/router`.

- [ ] **Step 3: Implement the production router**

Create `src/router.ts` with this content:

```ts
import { Hono } from "hono";
import type { DeckSource } from "./deck";
import { renderCompiledDeckPage } from "./compiled-render";

export interface HonoSlidesRouterOptions {
  source: DeckSource;
  dev?: boolean | "auto";
  style?: string;
}

export function honoSlidesRouter(options: HonoSlidesRouterOptions): Hono {
  const router = new Hono();

  router.get("/", async (c) => {
    const decks = await options.source.listDecks(c);
    return c.html(renderDeckIndex(decks, c.req.path));
  });

  router.get("/:slug/assets/*", async (c) => {
    const slug = c.req.param("slug");
    const assetPath = c.req.path.split(`/${slug}/assets/`)[1] ?? "";
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.json({ error: "Asset not found", slug, assetPath }, 404);
    return response;
  });

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck) return c.json({ error: "Deck not found", slug }, 404);
    return c.html(renderCompiledDeckPage({ deck, mountPath: c.req.path.replace(new RegExp(`/${slug}$`), ""), style: options.style }));
  });

  return router;
}

function renderDeckIndex(decks: Awaited<ReturnType<DeckSource["listDecks"]>>, mountPath: string): string {
  const basePath = mountPath.replace(/\/$/, "");
  const items = decks
    .map((deck) => {
      const href = `${basePath}/${encodeURIComponent(deck.slug)}`;
      const title = escapeHtml(deck.title ?? deck.slug);
      const description = deck.description ? `<p>${escapeHtml(deck.description)}</p>` : "";
      return `<li><a href="${href}">${title}</a>${description}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hono Slides</title>
</head>
<body>
  <main>
    <h1>Hono Slides</h1>
    <ul>${items}</ul>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/router.test.ts`

Expected: PASS for all router tests.

- [ ] **Step 5: Commit**

```bash
git add src/router.ts test/router.test.ts
git commit -m "Add production deck router"
```

---

### Task 5: Exports And Regression Check

**Files:**
- Modify: `src/mod.ts`
- Test: `test/middleware.test.ts`
- Test: `test/parser.test.ts`

- [ ] **Step 1: Write failing export smoke test**

Append this test to `test/router.test.ts`:

```ts
it("exports the production router from the public module", async () => {
  const mod = await import("../src/mod");
  expect(typeof mod.honoSlidesRouter).toBe("function");
  expect(typeof mod.manifestDeckSource).toBe("function");
  expect(typeof mod.resolveDeckFiles).toBe("function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/router.test.ts`

Expected: FAIL because `src/mod.ts` does not export `honoSlidesRouter`, `manifestDeckSource`, or `resolveDeckFiles`.

- [ ] **Step 3: Export the new runtime foundation**

Modify `src/mod.ts` so it contains:

```ts
export { honoSlides, renderDeckPage } from "./middleware";
export type { HonoSlidesOptions } from "./middleware";
export { parseDeck } from "./parser";
export { renderDeck, renderSlide } from "./render";
export { honoSlidesRouter } from "./router";
export type { HonoSlidesRouterOptions } from "./router";
export { manifestDeckSource } from "./manifest-source";
export { resolveDeckFiles } from "./file-routing";
export type { ResolvedDeckFile } from "./file-routing";
export type {
  AssetRef,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  CompileWarning,
  DeckEntry,
  DeckFrontmatter,
  DeckManifest,
  DeckSource,
  SlideFrontmatter,
} from "./deck";
export type { Slide, SlideBlock, SlideDeck } from "./types";
```

- [ ] **Step 4: Run the full quality gate**

Run: `npm run check`

Expected: PASS for TypeScript and all Vitest tests.

- [ ] **Step 5: Commit**

```bash
git add src/mod.ts test/router.test.ts
git commit -m "Export multi-deck runtime foundation"
```

---

## Plan Self-Review

Spec coverage for this slice:

- File layout and slug conflict behavior: Task 2.
- Runtime compiled deck contract: Task 1.
- Manifest-backed `DeckSource`: Task 1.
- Production Hono route surface: Task 4.
- Presentation controls baseline: Task 3.
- Public exports: Task 5.

Requirements intentionally deferred to separate plans:

- Real build CLI that scans the filesystem.
- Full MDX package compilation.
- Development editor routes.
- LocalDeckIO save/watch.
- Hono-owned preview event stream.
- Cloudflare Agent editing and Workers AI Code Mode tools.

Placeholder scan:

- No placeholder tokens or open-ended implementation instructions are used.
- The sample worker route is outside this slice; the required export deliverable is explicit.

Type consistency:

- `DeckSource`, `CompiledDeck`, `CompiledSlide`, `AssetRef`, and `DeckManifest` are defined before use.
- `manifestDeckSource`, `resolveDeckFiles`, and `honoSlidesRouter` names match across tests, implementation, and exports.
