# Compile Decks Build API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the standard Node-only `compileDecks({ root, out })` build API that discovers local deck files, compiles them, and writes the generated manifest module.

**Architecture:** This API lives in `hono-slides/node` and composes existing Node I/O helpers only. Deck discovery and file writing remain Node-only; slug resolution, manifest generation, and compilation stay in the existing Hono/Workers-safe modules.

**Tech Stack:** TypeScript, Vitest, existing `buildDeckManifestFromFileSystem()` and `writeDeckManifestModule()`.

---

### Task 1: `compileDecks()` Build API

**Files:**
- Modify: `src/node.ts`
- Modify: `test/node-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

Append this test inside `describe("Node filesystem deck adapter", ...)`:

```ts
it("compiles local decks to an output manifest module", async () => {
  const cwd = await createFixture();

  try {
    const manifest = await compileDecks({
      cwd,
      root: "decks",
      out: "src/generated/hono-slides-manifest.ts",
      mountPath: "/slides",
    });

    expect(manifest.decks.map((deck) => deck.slug)).toEqual(["deck1", "deck2"]);

    const output = await readFile(join(cwd, "src", "generated", "hono-slides-manifest.ts"), "utf8");
    expect(output).toContain("export const deckManifest =");
    expect(output).toContain('"publicPath": "/slides/deck1/assets/my%20image%231.svg"');
    expect(output).not.toContain("body");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
```

Update the import to include `compileDecks`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/node-adapter.test.ts`

Expected: FAIL because `compileDecks` is not exported from `src/node.ts`.

- [ ] **Step 3: Implement minimal API**

Add to `src/node.ts`:

```ts
export interface CompileDecksInput extends BuildDeckManifestFromFileSystemInput {
  out: string;
}

export async function compileDecks(input: CompileDecksInput): Promise<DeckManifest> {
  const manifest = await buildDeckManifestFromFileSystem(input);
  await writeDeckManifestModule({
    manifest,
    outFile: join(input.cwd, input.out),
  });
  return manifest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/node-adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full quality gate**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-compile-decks-build-api.md src/node.ts test/node-adapter.test.ts
git commit -m "Add compile decks build API"
```

### Self-Review

- Spec coverage: Implements the documented standard build API path `compileDecks({ root, out })`.
- Boundary check: API is exported only from `hono-slides/node`, so Worker-facing runtime does not import Node builtins.
- Placeholder scan: No placeholders.
