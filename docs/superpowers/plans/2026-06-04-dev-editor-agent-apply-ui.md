# Dev Editor Agent Apply UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated development editor page actually save raw MDX as JSON and use the Agent chat/apply routes.

**Architecture:** The editor page stays Hono-owned and local-dev-only. It intercepts the save form, posts JSON to `/save`, requests code-mode proposals from `/agent/chat`, applies accepted proposals through `/apply`, and listens to preview events.

**Tech Stack:** Hono-rendered HTML, browser fetch/EventSource, TypeScript, Vitest.

---

### Task 1: Editor Script And Controls

**Files:**
- Modify: `src/router.ts`
- Modify: `test/router.test.ts`

- [x] **Step 1: Write failing tests**

Assert the edit page includes markdown/instruction controls, Agent and Apply buttons, and script references to `/save`, `/agent/chat`, and `/apply`.

- [x] **Step 2: Implement editor UI**

Render controls for save status, Agent instruction, Agent result, Apply, and preview event output.

- [x] **Step 3: Implement browser script**

Use `fetch(saveUrl)`, `fetch(agentUrl)`, `fetch(applyUrl)`, and `EventSource(eventsUrl)`.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Development editor can save and use Agent proposal/apply flow.
- Boundary check: Browser calls Hono routes; Node remains behind `LocalDeckIO`.
- Placeholder scan: No placeholders.
