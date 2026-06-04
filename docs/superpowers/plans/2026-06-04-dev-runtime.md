# Dev Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Hono-owned development runtime that reacts to raw file events, recompiles decks, updates an in-memory source, and emits preview events.

**Architecture:** `LocalDeckIO.watch()` emits raw file events only. `createDevDeckRuntime()` lives in Worker-safe Hono code, uses `LocalDeckIO.readMarkdown()` plus a `DeckCompiler`, updates a mutable compiled deck source, and publishes `deck:updated` or `deck:error` through `PreviewEventHub`.

**Tech Stack:** TypeScript, Vitest, existing deck contracts and preview event hub.

---

### Task 1: Dev Runtime Source And Watch Flow

**Files:**
- Create: `src/dev-runtime.ts`
- Create: `test/dev-runtime.test.ts`
- Modify: `src/mod.ts`

- [x] **Step 1: Write failing tests**

Cover:

- Runtime exposes a `DeckSource` backed by initial compiled decks.
- Calling `handleFileChange({ slug, type: "changed", path })` reads raw markdown, compiles it, updates the source, and publishes `deck:updated`.
- Compile failures keep the previous compiled deck and publish `deck:error`.
- `start()` subscribes to `LocalDeckIO.watch()` and returns an unwatch function.

- [x] **Step 2: Implement runtime**

Create `createDevDeckRuntime({ initialDecks, localDeckIO, compiler, previewEvents })`.

- [x] **Step 3: Export runtime**

Export `createDevDeckRuntime` and related types from `src/mod.ts`.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- test/dev-runtime.test.ts
npm run check
```

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-dev-runtime.md src/dev-runtime.ts src/mod.ts test/dev-runtime.test.ts
git commit -m "Add dev deck runtime"
```

### Self-Review

- Spec coverage: Implements file event to Hono compile to preview event flow.
- Boundary check: Runtime imports no Node APIs and does not write files.
- Placeholder scan: No placeholders.
