# Agent Code Mode Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the non-persistent deck tool surface that Cloudflare Agents Code Mode can use for MDX deck editing proposals.

**Architecture:** The tool provider exposes read, compile, inspect, patch proposal, and patch validation tools under the `deck` namespace. It deliberately does not expose save or filesystem write tools; persistence remains owned by Hono save routes and `LocalDeckIO`.

**Tech Stack:** TypeScript, Vitest, `@cloudflare/codemode` ToolProvider contract, existing deck compiler/runtime contracts.

---

### Task 1: Deck Tool Provider

**Files:**
- Create: `src/agent-tools.ts`
- Create: `test/agent-tools.test.ts`
- Modify: `src/mod.ts`

- [x] **Step 1: Write failing tests**

Cover:

- Provider name is `deck`.
- Tools include `readDeck`, `getCompiledDeck`, `compileMarkdown`, `inspectSlides`, `createPatch`, and `validatePatch`.
- Tools do not include `writeDeck` or `saveDeck`.
- Patch proposals include `baseMarkdownHash`.
- Patch validation rejects stale hashes.

- [x] **Step 2: Implement provider**

Create `createDeckAgentToolProvider()` using a `ToolProvider`-compatible simple tool record.

- [x] **Step 3: Export provider**

Export `createDeckAgentToolProvider` and summary types from `src/mod.ts`.

- [x] **Step 4: Add Code Mode runtime dependencies and binding**

Add `@cloudflare/codemode`, `ai`, and `zod` dependencies. Add `worker_loaders = [{ binding = "LOADER" }]` to `wrangler.toml` and `LOADER: WorkerLoader` to `Env`.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- test/agent-tools.test.ts test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Implements the listed Code Mode tool surface without persistence.
- Boundary check: Agent tools can create and validate proposals, but cannot save.
- Placeholder scan: No placeholders.
