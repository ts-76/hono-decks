# Local Deck Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Node-only raw file watching to `LocalDeckIO`.

**Architecture:** The Node adapter emits raw file change events only. It does not compile decks, update runtime manifests, or publish preview events; Hono owns those later steps.

**Tech Stack:** TypeScript, Vitest, Node `fs.watch` with local type shims.

---

### Task 1: Node Watch Adapter

**Files:**
- Modify: `src/node.ts`
- Modify: `src/node-shims.d.ts`
- Modify: `test/node-adapter.test.ts`

- [ ] **Step 1: Write failing test**

Cover:

- `createLocalDeckIO({ cwd, root }).watch` exists.
- Changing `decks/deck1/deck.mdx` emits `{ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" }`.
- The returned unsubscribe function closes the watcher.

- [ ] **Step 2: Implement watch**

Use Node `fs.watch(rootDir, { recursive: true })`, normalize paths to repo-relative slash paths, and derive slug from the file-based deck path shape.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- test/node-adapter.test.ts
npm run check
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-local-deck-watch.md src/node.ts src/node-shims.d.ts test/node-adapter.test.ts
git commit -m "Add local deck file watching"
```

### Self-Review

- Spec coverage: Implements Node raw file events for the development data flow.
- Boundary check: Node owns only I/O events; Hono preview event hub remains separate.
- Placeholder scan: No placeholders.
