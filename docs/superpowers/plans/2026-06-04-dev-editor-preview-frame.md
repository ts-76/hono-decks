# Dev Editor Preview Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live presentation preview frame to the development editor.

**Architecture:** The editor page embeds the presentation route in an iframe and reloads it after save, apply, and preview update events. The editor state remains in the textarea while the preview refreshes separately.

**Tech Stack:** Hono-rendered HTML, browser fetch/EventSource, Vitest.

---

### Task 1: Preview Frame

**Files:**
- Modify: `src/router.ts`
- Modify: `test/router.test.ts`

- [x] **Step 1: Write failing tests**

Assert the edit page includes `previewFrame`, points it at the deck presentation route, and includes `reloadPreview()`.

- [x] **Step 2: Render iframe**

Add `<iframe id="previewFrame" src="<mount>/<slug>">`.

- [x] **Step 3: Reload preview**

Call `reloadPreview()` after save, apply, and `deck:updated` events.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Editor preview can update without losing textarea state.
- Boundary check: Preview reloads presentation route; editor remains dev-only.
- Placeholder scan: No placeholders.
