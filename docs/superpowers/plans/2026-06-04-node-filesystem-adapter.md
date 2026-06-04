# Node Filesystem Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Node-only adapter that discovers deck files on disk, builds a `DeckManifest`, and writes a manifest module file.

**Architecture:** Node filesystem access lives behind the separate `hono-slides/node` export. The default runtime export remains Worker-safe and does not import Node builtins.

**Tech Stack:** TypeScript, Vitest, Node ESM builtins with local type shims.

---

## Scope

This plan implements:

- `buildDeckManifestFromFileSystem()` for local deck discovery and compilation.
- `writeDeckManifestModule()` for writing generated module output.
- `hono-slides/node` package export.
- Minimal local Node builtin type shims because this project intentionally does not include `@types/node`.

This plan does not implement:

- A command-line binary.
- Dev editor save/watch.
- Hot reload event streaming.
- Cloudflare Agent editing tools.

## File Structure

- Create `src/node.ts`
  - Owns Node-only filesystem adapter functions.

- Create `src/node-shims.d.ts`
  - Provides minimal Node builtin declarations used by `src/node.ts` and its tests.

- Modify `package.json`
  - Adds `./node` export.

- Add `test/node-adapter.test.ts`
  - Covers filesystem discovery, generated manifests, generated module writing, and public node export.

---

### Task 1: Node Filesystem Manifest Builder

**Files:**
- Create: `src/node.ts`
- Create: `src/node-shims.d.ts`
- Test: `test/node-adapter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/node-adapter.test.ts` with this content:

```ts
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildDeckManifestFromFileSystem, writeDeckManifestModule } from "../src/node";

describe("Node filesystem deck adapter", () => {
  it("discovers deck files, compiles decks, and maps local assets", async () => {
    const cwd = await createFixture();

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

    await rm(cwd, { recursive: true, force: true });
  });

  it("writes a generated manifest module", async () => {
    const cwd = await createFixture();
    const manifest = await buildDeckManifestFromFileSystem({ cwd, root: "decks", mountPath: "/slides" });
    const outFile = join(cwd, "src", "generated", "hono-slides-manifest.ts");

    await writeDeckManifestModule({ manifest, outFile });

    const output = await readFile(outFile, "utf8");
    expect(output).toContain('import type { DeckManifest } from "hono-slides";');
    expect(output).toContain("export const deckManifest =");
    expect(output).toContain('"slug": "deck1"');
    expect(output).not.toContain("body");

    await rm(cwd, { recursive: true, force: true });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/node-adapter.test.ts`

Expected: FAIL with module resolution error for `../src/node`.

- [ ] **Step 3: Add Node builtin shims**

Create `src/node-shims.d.ts` with this content:

```ts
declare module "node:fs/promises" {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }

  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
  export function mkdir(path: string, options: { recursive: true }): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(path: string, options: { recursive: boolean; force: boolean }): Promise<void>;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}
```

- [ ] **Step 4: Implement Node adapter**

Create `src/node.ts` with this content:

```ts
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { buildDeckManifest, emitDeckManifestModule } from "./manifest-generator";
import type { DeckManifest } from "./deck";

export interface BuildDeckManifestFromFileSystemInput {
  cwd: string;
  root: string;
  mountPath?: string;
}

export interface WriteDeckManifestModuleInput {
  manifest: DeckManifest;
  outFile: string;
}

export async function buildDeckManifestFromFileSystem(
  input: BuildDeckManifestFromFileSystemInput,
): Promise<DeckManifest> {
  const rootDir = join(input.cwd, input.root);
  const paths = await listFiles(input.cwd, rootDir);
  return buildDeckManifest({
    root: normalizePath(input.root),
    paths,
    mountPath: input.mountPath,
    readText: async (path) => readFile(join(input.cwd, path), "utf8"),
    readBinary: async (path) => readFile(join(input.cwd, path)),
  });
}

export async function writeDeckManifestModule(input: WriteDeckManifestModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckManifestModule(input.manifest), "utf8");
}

async function listFiles(cwd: string, dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(cwd, fullPath);
      if (entry.isFile()) return [normalizePath(relative(cwd, fullPath))];
      return [];
    }),
  );
  return paths.flat().sort();
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  return normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : ".";
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- test/node-adapter.test.ts`

Expected: PASS.

---

### Task 2: Package Export And Regression

**Files:**
- Modify: `package.json`
- Modify: `test/node-adapter.test.ts`

- [ ] **Step 1: Add export smoke test**

Append this test to `test/node-adapter.test.ts`:

```ts
it("can import the node adapter through the package subpath", async () => {
  const mod = await import("../src/node");
  expect(typeof mod.buildDeckManifestFromFileSystem).toBe("function");
  expect(typeof mod.writeDeckManifestModule).toBe("function");
});
```

- [ ] **Step 2: Add package subpath export**

Update `package.json` exports:

```json
"exports": {
  ".": "./src/mod.ts",
  "./node": "./src/node.ts",
  "./worker": "./src/index.ts"
}
```

- [ ] **Step 3: Run full quality gate**

Run: `npm run check`

Expected: PASS for typecheck and all tests.

- [ ] **Step 4: Commit**

```bash
git add package.json src/node.ts src/node-shims.d.ts test/node-adapter.test.ts
git commit -m "Add node filesystem deck adapter"
```

---

## Plan Self-Review

Spec coverage for this slice:

- Local Node I/O adapter for discovery/read: Task 1.
- Generated manifest module writing: Task 1.
- Node code isolated behind a separate export: Task 2.

Deferred to separate slices:

- CLI command wrapper.
- Dev editor save/watch.
- Hono hot reload event stream.
