# Presentation Controls Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production presentation controls interactive.

**Architecture:** The compiled presentation page ships a small inline script for slide navigation, keyboard shortcuts, fullscreen, presenter notes, timer, and overview. This remains runtime-only rendering with no production editing routes.

**Tech Stack:** TypeScript-rendered HTML, browser DOM APIs, Vitest.

---

### Task 1: Controls Script

**Files:**
- Modify: `src/compiled-render.ts`
- Modify: `test/compiled-render.test.ts`

- [x] **Step 1: Write failing tests**

Assert the rendered page includes keyboard handling, fullscreen calls, presenter mode state, overview state, and timer setup.

- [x] **Step 2: Implement presentation script**

Add inline JavaScript for previous/next, keyboard navigation, fullscreen, presenter mode, overview, and timer.

- [x] **Step 3: Add state styles**

Add CSS for hidden slides, overview grid, and presenter notes.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- test/compiled-render.test.ts
npm run check
```

### Self-Review

- Spec coverage: Implements the first presentation tool set.
- Boundary check: Production page remains presentation-only.
- Placeholder scan: No placeholders.
