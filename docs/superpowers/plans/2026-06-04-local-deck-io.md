# Local Deck IO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the local development raw MDX I/O boundary used by future save/HMR routes.

**Architecture:** `LocalDeckIO` is a Worker-safe interface with no Node imports. The Node implementation lives only in `hono-slides/node`, discovers file-based decks with the existing resolver, and reads/writes raw `.mdx` without compiling or rendering.

**Tech Stack:** TypeScript, Vitest, existing `resolveDeckFiles()` and Node filesystem helpers.

---

### Task 1: Local Deck IO Contracts

**Files:**
- Modify: `src/deck.ts`
- Modify: `src/mod.ts`
- Modify: `test/node-adapter.test.ts`

- [ ] **Step 1: Write the failing type/API test**

Add expectations for `createLocalDeckIO()` in `test/node-adapter.test.ts` and import the new symbol from `../src/node`.

- [ ] **Step 2: Add contracts**

Add to `src/deck.ts`:

```ts
export interface DeckFileEntry {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
}

export interface DeckFileChange {
  type: "created" | "changed" | "deleted";
  path: string;
  slug?: string;
}

export interface LocalDeckIO {
  listFiles(): Promise<DeckFileEntry[]>;
  readMarkdown(slug: string): Promise<string | null>;
  writeMarkdown(slug: string, markdown: string): Promise<void>;
  watch?(onFileChange: (event: DeckFileChange) => void): () => void;
}
```

- [ ] **Step 3: Export contracts**

Add `DeckFileEntry`, `DeckFileChange`, and `LocalDeckIO` to the type exports in `src/mod.ts`.

### Task 2: Node Local Deck IO

**Files:**
- Modify: `src/node.ts`
- Modify: `test/node-adapter.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Cover:

- `listFiles()` returns directory and single-file deck entries.
- `readMarkdown(slug)` returns raw `.mdx` for an existing deck and `null` for an unknown slug.
- `writeMarkdown(slug, markdown)` saves raw `.mdx` only and does not compile.
- `writeMarkdown()` rejects unknown slugs.
- `hono-slides/node` exports `createLocalDeckIO`.

- [ ] **Step 2: Implement minimal Node adapter**

Add `createLocalDeckIO({ cwd, root })` to `src/node.ts`. It should call the existing file listing plus `resolveDeckFiles()`, then use `readFile()` and `writeFile()` against the resolved `sourcePath`.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- test/node-adapter.test.ts
npm run check
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-local-deck-io.md src/deck.ts src/mod.ts src/node.ts test/node-adapter.test.ts
git commit -m "Add local deck IO adapter"
```

### Self-Review

- Spec coverage: Implements `LocalDeckIO.writeMarkdown()` saving raw MDX only and sets the boundary for Hono save routes.
- Boundary check: Node implementation stays behind `hono-slides/node`; public runtime only exports types.
- Placeholder scan: No placeholders.
