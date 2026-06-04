# Dev Router Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Hono-owned development route surface for edit, save, events, and agent chat.

**Architecture:** Hono owns the dev routes and calls `LocalDeckIO` only for raw `.mdx` read/write. Agent chat is represented as a Hono callback input contract so Cloudflare Agents can be wired in later without giving Node ownership of chat or persistence.

**Tech Stack:** Hono, TypeScript, Vitest, existing `DeckSource` and `LocalDeckIO` contracts.

---

### Task 1: Dev Route Tests

**Files:**
- Modify: `test/router.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover:

- `GET /decks/:slug/edit` returns an editor page with raw MDX when `dev: true`.
- `POST /decks/:slug/save` calls `LocalDeckIO.writeMarkdown(slug, markdown)` and returns JSON.
- `GET /decks/:slug/events` returns an SSE response when `dev: true`.
- `POST /decks/:slug/agent/chat` invokes an `agentChat` callback with `slug`, `sessionId`, `markdown`, `instruction`, and `activeSlide`.
- Dev routes stay 404 when `dev: false`.

### Task 2: Router Dev Surface

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: Extend options**

Add optional `localDeckIO` and `agentChat` options to `HonoSlidesRouterOptions`.

- [ ] **Step 2: Add dev route registration**

Register dev routes only when `dev` resolves enabled.

- [ ] **Step 3: Keep Node out of router**

Use only the `LocalDeckIO` interface. Do not import `src/node.ts` or Node builtins.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- test/router.test.ts
npm run check
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-dev-router-surface.md src/router.ts test/router.test.ts
git commit -m "Add dev router surface"
```

### Self-Review

- Spec coverage: Implements the dev-only route surface and raw save flow.
- Boundary check: Hono owns routes; Node remains only behind `LocalDeckIO` implementations.
- Placeholder scan: No placeholders.
