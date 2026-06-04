# Dev Auto Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `dev: "auto"` for the Hono slides router.

**Architecture:** `auto` resolves to enabled only when a `LocalDeckIO` adapter is configured. This keeps production manifest-only usage presentation-only while allowing local dev wiring to opt into edit/save/events/agent routes without also setting `dev: true`.

**Tech Stack:** Hono, TypeScript, Vitest.

---

### Task 1: Auto Dev Resolution

**Files:**
- Modify: `src/router.ts`
- Modify: `test/router.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- `dev: "auto"` enables `/edit` when `localDeckIO` is present.
- `dev: "auto"` keeps `/edit` 404 when `localDeckIO` is absent.

- [ ] **Step 2: Implement resolution**

Change dev route registration to enable when `dev === true || (dev === "auto" && localDeckIO exists)`.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- test/router.test.ts
npm run check
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-dev-auto-mode.md src/router.ts test/router.test.ts
git commit -m "Add dev auto mode"
```

### Self-Review

- Spec coverage: Implements `dev: "auto"` from the route surface spec.
- Boundary check: No Node imports; auto depends on the interface-level `LocalDeckIO` option.
- Placeholder scan: No placeholders.
