# Manifest Generation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure manifest-generation foundation that turns discovered deck files and raw file contents into a `DeckManifest` and an exportable manifest module string.

**Architecture:** This slice keeps Node filesystem access out of runtime code. It accepts already-discovered file entries and a read callback, then uses `resolveDeckFiles()` and `compileMarkdown()` to produce the manifest. A separate Node adapter slice will provide actual filesystem discovery/read/write/watch.

**Tech Stack:** TypeScript, Vitest, existing `resolveDeckFiles()`, `compileMarkdown()`, and `manifestDeckSource()`.

---

## Scope

This plan implements:

- `buildDeckManifest()` for pure manifest generation.
- Directory deck local asset references from `decks/<slug>/assets/*`.
- `emitDeckManifestModule()` to generate a TypeScript module string for build output.
- Public exports for the manifest generation API.

This plan does not implement:

- Direct Node filesystem scanning.
- CLI wiring.
- Dev save/watch I/O.
- R2/public asset fetching.

## File Structure

- Create `src/manifest-generator.ts`
  - Owns pure manifest generation from file path lists and content readers.

- Modify `src/mod.ts`
  - Exports the pure generator API.

- Add `test/manifest-generator.test.ts`
  - Covers directory decks, single-file decks, local asset refs, conflict propagation, and emitted module text.

---

### Task 1: Build A Manifest From File Entries

**Files:**
- Create: `src/manifest-generator.ts`
- Test: `test/manifest-generator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/manifest-generator.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { buildDeckManifest, emitDeckManifestModule } from "../src/manifest-generator";

describe("buildDeckManifest", () => {
  it("builds a compiled manifest from directory and single-file deck entries", async () => {
    const files = new Map<string, string | Uint8Array>([
      [
        "decks/deck1/deck.mdx",
        `---
title: Deck One
---

# Deck One`,
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
    ]);
    expect(manifest.decks[1]).toMatchObject({
      slug: "deck2",
      sourcePath: "decks/deck2.mdx",
      kind: "single-file",
      meta: { title: "Deck Two" },
      assets: [],
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
  it("emits an importable TypeScript manifest module without binary bodies", async () => {
    const manifest = await buildDeckManifest({
      root: "decks",
      paths: ["decks/deck1/deck.mdx", "decks/deck1/assets/image.png"],
      readText: async () => "# Deck One",
      readBinary: async () => new Uint8Array([1, 2, 3]),
      mountPath: "/decks",
    });

    const source = emitDeckManifestModule(manifest);

    expect(source).toContain('import type { DeckManifest } from "hono-slides";');
    expect(source).toContain("export const deckManifest =");
    expect(source).toContain('"slug": "deck1"');
    expect(source).toContain('"publicPath": "/decks/deck1/assets/image.png"');
    expect(source).not.toContain("body");
    expect(source).toContain("satisfies DeckManifest;");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/manifest-generator.test.ts`

Expected: FAIL with module resolution error for `../src/manifest-generator`.

- [ ] **Step 3: Implement manifest generation**

Create `src/manifest-generator.ts` with this content:

```ts
import { compileMarkdown } from "./compiler";
import type { AssetRef, DeckManifest } from "./deck";
import { resolveDeckFiles } from "./file-routing";

export interface BuildDeckManifestInput {
  root: string;
  paths: string[];
  mountPath?: string;
  readText(path: string): Promise<string>;
  readBinary?(path: string): Promise<Uint8Array>;
}

export async function buildDeckManifest(input: BuildDeckManifestInput): Promise<DeckManifest> {
  const resolved = resolveDeckFiles(input.paths, input.root);
  const decks = await Promise.all(
    resolved.map(async (entry) => {
      const markdown = await input.readText(entry.sourcePath);
      const deck = await compileMarkdown({
        slug: entry.slug,
        sourcePath: entry.sourcePath,
        kind: entry.kind,
        markdown,
      });
      return {
        ...deck,
        assets: await buildAssetRefs(entry.slug, entry.assetPaths, input),
      };
    }),
  );

  return { decks };
}

export function emitDeckManifestModule(manifest: DeckManifest): string {
  const serializable = {
    decks: manifest.decks.map((deck) => ({
      ...deck,
      assets: deck.assets.map(({ body: _body, ...asset }) => asset),
    })),
  };

  return `import type { DeckManifest } from "hono-slides";\n\nexport const deckManifest = ${JSON.stringify(
    serializable,
    null,
    2,
  )} satisfies DeckManifest;\n`;
}

async function buildAssetRefs(
  slug: string,
  assetPaths: string[],
  input: BuildDeckManifestInput,
): Promise<AssetRef[]> {
  return Promise.all(
    assetPaths.map(async (sourcePath) => {
      const publicPath = `${normalizeMountPath(input.mountPath ?? `/${input.root}`)}/${slug}/assets/${assetName(sourcePath)}`;
      return {
        sourcePath,
        publicPath,
        type: "local",
        contentType: contentTypeForPath(sourcePath),
        body: input.readBinary ? await input.readBinary(sourcePath) : undefined,
      };
    }),
  );
}

function assetName(sourcePath: string): string {
  const marker = "/assets/";
  const index = sourcePath.indexOf(marker);
  return index === -1 ? sourcePath.split("/").at(-1) ?? sourcePath : sourcePath.slice(index + marker.length);
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function contentTypeForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/manifest-generator.test.ts`

Expected: PASS.

---

### Task 2: Public Exports And Full Regression

**Files:**
- Modify: `src/mod.ts`
- Modify: `test/manifest-generator.test.ts`

- [ ] **Step 1: Add export smoke test**

Append this test to `test/manifest-generator.test.ts`:

```ts
it("exports manifest generation helpers from the public module", async () => {
  const mod = await import("../src/mod");
  expect(typeof mod.buildDeckManifest).toBe("function");
  expect(typeof mod.emitDeckManifestModule).toBe("function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/manifest-generator.test.ts`

Expected: FAIL because `src/mod.ts` does not export these helpers yet.

- [ ] **Step 3: Export manifest generation helpers**

Add these exports to `src/mod.ts`:

```ts
export { buildDeckManifest, emitDeckManifestModule } from "./manifest-generator";
export type { BuildDeckManifestInput } from "./manifest-generator";
```

- [ ] **Step 4: Run full quality gate**

Run: `npm run check`

Expected: PASS for typecheck and all tests.

- [ ] **Step 5: Commit**

```bash
git add src/manifest-generator.ts src/mod.ts test/manifest-generator.test.ts
git commit -m "Add deck manifest generation foundation"
```

---

## Plan Self-Review

Spec coverage for this slice:

- Standard build manifest generation path: Task 1.
- Directory deck local asset mapping: Task 1.
- Generated manifest can be wrapped by `manifestDeckSource`: Task 1 creates a `DeckManifest` contract object.
- Public exports: Task 2.

Deferred to separate slices:

- Node filesystem adapter that discovers paths and supplies `readText`/`readBinary`.
- CLI writing an output file.
- Development save/watch and hot reload.
