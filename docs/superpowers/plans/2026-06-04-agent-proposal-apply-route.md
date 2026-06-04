# Agent Proposal Apply Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-only Hono route that applies Agent edit proposals through `LocalDeckIO` without letting Agents persist edits directly.

**Architecture:** `/decks/:slug/apply` reads current raw MDX, verifies `baseMarkdownHash`, applies replacement or patch proposals in memory, writes once through `LocalDeckIO.writeMarkdown()`, and publishes a preview event after the write succeeds. The route is only registered when dev routes are enabled.

**Tech Stack:** Hono, TypeScript, Vitest, existing `DeckAgentEditProposal`, `LocalDeckIO`, and preview event contracts.

---

### Task 1: Proposal Apply Helper And Route

**Files:**
- Create: `src/agent-apply.ts`
- Create: `test/agent-apply.test.ts`
- Modify: `src/router.ts`
- Modify: `test/router.test.ts`
- Modify: `src/mod.ts`

- [x] **Step 1: Write failing router tests**

Cover replacement success, patch success, stale hash rejection, dev-disabled 404, ambiguous patch rejection, and source path mismatch rejection.

- [x] **Step 2: Implement proposal helper**

Create `applyDeckAgentProposal(markdown, proposal, { sourcePath })`.

- [x] **Step 3: Wire dev route**

Register `POST /:slug/apply` inside the dev-only route block.

- [x] **Step 4: Add unit tests**

Cover invalid proposal payloads, invalid replacement, missing patch arrays, empty `oldText`, missing matches, ambiguous matches, and all-patch in-memory application.

- [x] **Step 5: Export helper**

Export `applyDeckAgentProposal` and `ApplyDeckAgentProposalResult`.

- [x] **Step 6: Verify**

Run:

```bash
npm test -- test/agent-apply.test.ts test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Agents return proposals; Hono owns apply/save.
- Boundary check: Route is dev-only and uses `LocalDeckIO` for persistence.
- Placeholder scan: No placeholders.
