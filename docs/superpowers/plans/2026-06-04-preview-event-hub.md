# Preview Event Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Hono-owned preview event hub needed for development hot reload.

**Architecture:** Node/local I/O may emit raw file events later, but Hono owns the preview event stream. The router receives an optional `previewEvents` hub, emits a `deck:updated` event after save, and `/events` drains pending preview events as SSE without importing Node APIs.

**Tech Stack:** Hono, TypeScript, Vitest, Web `Response`.

---

### Task 1: Preview Event Hub Contract

**Files:**
- Create: `src/preview-events.ts`
- Modify: `src/mod.ts`
- Modify: `test/router.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- `createPreviewEventHub()` is exported from the public module.
- A manually published `deck:updated` event appears in `GET /:slug/events`.
- `POST /:slug/save` writes raw Markdown and publishes a `deck:updated` event.

- [ ] **Step 2: Implement event hub**

Create a small in-memory hub:

```ts
export interface PreviewEvent {
  type: "ready" | "deck:updated" | "deck:error";
  slug: string;
  data?: unknown;
}

export interface PreviewEventHub {
  publish(event: PreviewEvent): void;
  drain(slug: string): PreviewEvent[];
}
```

### Task 2: Router Integration

**Files:**
- Modify: `src/router.ts`
- Modify: `test/router.test.ts`

- [ ] **Step 1: Add `previewEvents` option**

Add optional `previewEvents?: PreviewEventHub` to `HonoSlidesRouterOptions`.

- [ ] **Step 2: Emit after save**

After `LocalDeckIO.writeMarkdown()`, call `previewEvents?.publish({ type: "deck:updated", slug, data: { source: "save" } })`.

- [ ] **Step 3: Render SSE events**

`GET /:slug/events` should always include `ready`, then any drained pending events for that slug.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- test/router.test.ts
npm run check
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-06-04-preview-event-hub.md src/preview-events.ts src/mod.ts src/router.ts test/router.test.ts
git commit -m "Add preview event hub"
```

### Self-Review

- Spec coverage: Adds the Hono-owned preview event stream surface for hot reload.
- Boundary check: No Node imports; file watching remains outside this slice.
- Placeholder scan: No placeholders.
