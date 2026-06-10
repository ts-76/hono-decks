# Public Viewer And Edit Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the production viewing route from the development editing/controller surface while preserving a 1920x1080 iframe-based deck viewport.

**Architecture:** `/:slug` becomes a public viewer wrapper with only Prev, Next, Full, click navigation, and keyboard navigation. The actual fixed-size deck render moves to `/:slug/render`, and all editor, chat, save, apply, and event endpoints move under `/:slug/edit/*`. Hono remains the owner of routing, rendering, apply/save persistence, and preview event streams.

**Tech Stack:** Hono, TypeScript-rendered HTML, Cloudflare Workers runtime, Vitest, bun.

---

## Route Contract

Production routes:

```text
GET /:slug                public iframe viewer wrapper
GET /:slug/render         fixed 1920x1080 compiled deck render
GET /:slug/assets/*       deck assets
```

Development-only routes:

```text
GET  /:slug/edit              editor, chat, preview, controller workspace
POST /:slug/edit/save         raw MDX save route
POST /:slug/edit/apply        approved proposal apply route
POST /:slug/edit/agent/chat   Agent chat/proposal route
GET  /:slug/edit/events       preview event polling route
```

Deprecated compatibility:

```text
GET /:slug/presentation
```

Recommended implementation: keep `/:slug/presentation` as a temporary redirect or alias to `/:slug/render` for existing links, but remove it from all visible UI, docs, and tests except one explicit compatibility test. Do not add chat, editor controls, or public navigation to `/:slug/presentation`.

---

## File Structure

- Modify: `src/router.ts`
  - Register `/:slug/render`.
  - Move dev endpoints under `/:slug/edit/*`.
  - Simplify `renderDeckViewerPage()` so public viewer has no chat panel and no Presentation link.
  - Update `renderEditorPage()` URLs and preview iframe.
- Modify: `test/router.test.ts`
  - Update route surface tests.
  - Add public viewer negative assertions for chat, apply, agent, and Presentation link.
  - Add new edit-route tests.
- Modify: `test/local-dev-app.test.ts`
  - Update local dev helper route expectations.
- Modify: `test/worker-sample.test.ts`
  - Update sample Worker expectations to `/decks/sample`, `/decks/sample/render`, and `/decks/sample/edit/*`.
- Modify: `README.md`
  - Update route table, sample instructions, and migration note.
- Optional modify: `test/cloudflare-agent-chat.test.ts`
  - Only update URL examples if those tests assert request URLs.

---

### Task 1: Public Viewer Route Contract

**Files:**
- Modify: `test/router.test.ts`
- Modify: `src/router.ts`

- [ ] **Step 1: Write failing tests for viewer and render routes**

In `test/router.test.ts`, update the production viewer test so `/slides/deck1` points at `/slides/deck1/render` and exposes only public controls.

```ts
expect(html).toContain('data-hono-slides-viewer');
expect(html).toContain('src="/slides/deck1/render"');
expect(html).toContain('width="1920"');
expect(html).toContain('height="1080"');
expect(html).toContain('data-action="previous"');
expect(html).toContain('data-action="next"');
expect(html).toContain('data-action="fullscreen"');
expect(html).toContain('type: "hono-slides:command"');
expect(html).toContain("contentWindow?.postMessage");
expect(html).toContain("requestFullscreen");
expect(html).toContain("viewerClick");
expect(html).not.toContain('data-action="presentation"');
expect(html).not.toContain("/presentation");
expect(html).not.toContain('<aside data-hono-slides-chat');
expect(html).not.toContain("/agent/chat");
expect(html).not.toContain("/apply");
expect(html).not.toContain("<h1>Intro</h1>");
```

Add or update the render route assertion.

```ts
const response = await app.request("/slides/deck1/render");
expect(response.status).toBe(200);
expect(response.headers.get("content-type")).toContain("text/html");
const html = await response.text();
expect(html).toContain("<h1>Intro</h1>");
expect(html).toContain("--hono-slides-width:1920px");
expect(html).toContain("--hono-slides-height:1080px");
expect(html).toContain('window.addEventListener("message"');
expect(html).toContain('message.type !== "hono-slides:command"');
expect(html).toContain('window.parent.postMessage({ type: "hono-slides:state"');
expect(html).not.toContain('data-hono-slides-controls');
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
bun test test/router.test.ts
```

Expected: failures mention the old `/presentation` iframe URL, missing `/render`, and public viewer chat/presentation expectations.

- [ ] **Step 3: Implement `/:slug/render`**

In `src/router.ts`, replace the current `router.get("/:slug/presentation", ...)` primary route with `router.get("/:slug/render", ...)`.

```ts
router.get("/:slug/render", async (c) => {
  const slug = c.req.param("slug");
  const deck = await options.source.getCompiledDeck(c, slug);
  if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
  const mountPath = stripPathSuffix(c.req.path, `/${slug}/render`);
  return c.html(
    renderCompiledDeckPage({
      deck,
      mountPath,
      style: options.style,
      liveReloadPath: isDevEnabled(options) ? `${mountPath}/${encodeURIComponent(slug)}/edit/events` : undefined,
    }),
  );
});
```

- [ ] **Step 4: Keep one compatibility route for `/:slug/presentation`**

Add this after `/:slug/render` and before `/:slug`.

```ts
router.get("/:slug/presentation", async (c) => {
  const slug = c.req.param("slug");
  return c.redirect(`${stripPathSuffix(c.req.path, `/${slug}/presentation`)}/${encodeURIComponent(slug)}/render`, 302);
});
```

- [ ] **Step 5: Simplify `renderDeckViewerPage()`**

Change its input type and URL construction.

```ts
function renderDeckViewerPage(input: { slug: string; title: string; mountPath: string }): string {
  const renderUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/render`;
```

Remove `chatEnabled`, `agentUrl`, `applyUrl`, `renderDeckViewerChatPanel()`, and `renderDeckViewerChatScript()` from the viewer page.

Change the iframe and controls.

```html
<iframe title="${escapeHtml(input.title)}" src="${escapeHtml(renderUrl)}" width="1920" height="1080"></iframe>
<nav class="hono-slides-viewer-controls" aria-label="Viewer controls">
  <button type="button" data-action="previous">Prev</button>
  <span data-slide-position>1 / ?</span>
  <button type="button" data-action="next">Next</button>
  <button type="button" data-action="fullscreen">Full</button>
</nav>
```

- [ ] **Step 6: Add click navigation to the public viewer**

Add a named click handler so tests can assert it without relying on minified details. Left half goes previous; right half goes next.

```js
function viewerClick(event) {
  const target = event.target;
  if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
  const bounds = viewport?.getBoundingClientRect();
  if (!bounds) return;
  const action = event.clientX < bounds.left + bounds.width / 2 ? "previous" : "next";
  sendCommand(action);
}

viewport?.addEventListener("click", viewerClick);
```

- [ ] **Step 7: Update `honoSlidesRouter()` viewer invocation**

Remove `chatEnabled` from the public `/:slug` route.

```ts
return c.html(
  renderDeckViewerPage({
    slug,
    title: deck.meta.title ?? slug,
    mountPath,
  }),
);
```

- [ ] **Step 8: Verify Task 1**

Run:

```bash
bun test test/router.test.ts
```

Expected: public viewer and render route assertions pass, while edit endpoint tests may still fail until Task 2.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/router.ts test/router.test.ts
git commit -m "feat: split public viewer from render route"
```

---

### Task 2: Move Development APIs Under Edit

**Files:**
- Modify: `test/router.test.ts`
- Modify: `src/router.ts`

- [ ] **Step 1: Write failing tests for edit-scoped routes**

Update production negative assertions.

```ts
expect((await app.request("/decks/deck1/edit")).status).toBe(404);
expect((await app.request("/decks/deck1/edit/events")).status).toBe(404);
expect((await app.request("/decks/deck1/edit/save", { method: "POST" })).status).toBe(404);
expect((await app.request("/decks/deck1/edit/agent/chat", { method: "POST" })).status).toBe(404);
expect((await app.request("/decks/deck1/edit/apply", { method: "POST" })).status).toBe(404);
```

Update development route requests from:

```ts
"/decks/deck1/save"
"/decks/deck1/events?once=1"
"/decks/deck1/agent/chat"
"/decks/deck1/apply"
```

to:

```ts
"/decks/deck1/edit/save"
"/decks/deck1/edit/events?once=1"
"/decks/deck1/edit/agent/chat"
"/decks/deck1/edit/apply"
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
bun test test/router.test.ts
```

Expected: failures show old dev route registrations and old editor URLs.

- [ ] **Step 3: Move dev route registrations**

In `src/router.ts`, change the dev-only route definitions.

```ts
router.post("/:slug/edit/save", async (c) => {
  // keep the existing save implementation body
});

router.get("/:slug/edit/events", (c) => {
  const slug = c.req.param("slug");
  return oneShotEventResponse(slug, options.previewEvents);
});

router.post("/:slug/edit/agent/chat", async (c) => {
  // keep the existing agent chat implementation body
});

router.post("/:slug/edit/apply", async (c) => {
  // keep the existing apply implementation body
});
```

- [ ] **Step 4: Update editor page URLs**

In `renderEditorPage()`, update the URLs.

```ts
const editBaseUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/edit`;
const saveUrl = `${editBaseUrl}/save`;
const agentUrl = `${editBaseUrl}/agent/chat`;
const applyUrl = `${editBaseUrl}/apply`;
const eventsUrl = `${editBaseUrl}/events`;
const previewUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/render`;
```

Change the script to use the generated `eventsUrl` constant instead of rebuilding the old path.

```js
const eventsUrl = ${JSON.stringify(eventsUrl)};
```

- [ ] **Step 5: Add a presentation/render control only to the edit page**

Add a link near the preview iframe. This is an authoring control, not a public viewer control.

```html
<div class="toolbar">
  <a class="button" href="${escapeHtml(previewUrl)}" target="_blank" rel="noreferrer">Presentation</a>
</div>
<iframe id="previewFrame" title="Deck preview" src="${escapeHtml(previewUrl)}"></iframe>
```

Add a CSS rule if needed.

```css
a.button { border: 1px solid #b9c4d8; border-radius: 8px; padding: 8px 12px; background: #fff; color: #172033; text-decoration: none; }
```

- [ ] **Step 6: Verify Task 2**

Run:

```bash
bun test test/router.test.ts
```

Expected: route, editor URL, save, events, agent chat, and apply tests pass on edit-scoped paths.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/router.ts test/router.test.ts
git commit -m "feat: scope development controls under edit"
```

---

### Task 3: Local Dev And Sample Worker Updates

**Files:**
- Modify: `test/local-dev-app.test.ts`
- Modify: `test/worker-sample.test.ts`
- Modify: `src/index.ts` only if the sample app hardcodes old routes

- [ ] **Step 1: Update local dev route tests**

In `test/local-dev-app.test.ts`, update expectations:

```ts
expect(viewHtml).toContain("/slides/local/render");
const render = await app.request("/slides/local/render");
expect(render.status).toBe(200);
expect(await render.text()).toContain("/slides/local/edit/events");

const save = await app.request("/slides/local/edit/save", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ markdown: "# Updated" }),
});

const events = await app.request("/slides/local/edit/events?once=1");
```

- [ ] **Step 2: Update sample Worker tests**

In `test/worker-sample.test.ts`, public sample viewer should not expose chat.

```ts
expect(html).toContain('src="/decks/sample/render"');
expect(html).not.toContain('data-hono-slides-chat');
expect(html).not.toContain("/decks/sample/agent/chat");
expect(html).not.toContain("/decks/sample/apply");
expect(html).not.toContain("/decks/sample/presentation");
```

The compiled deck test should request:

```ts
const response = await app.request("/decks/sample/render");
```

The chat and apply tests should request:

```ts
await app.request("/decks/sample/edit/agent/chat", { method: "POST", ... });
await app.request("/decks/sample/edit/apply", { method: "POST", ... });
```

Add a test that the edit page is the practical demo surface.

```ts
const response = await app.request("/decks/sample/edit");
expect(response.status).toBe(200);
const html = await response.text();
expect(html).toContain('id="markdown"');
expect(html).toContain('id="agentButton"');
expect(html).toContain('id="previewFrame"');
expect(html).toContain('src="/decks/sample/render"');
expect(html).toContain("/decks/sample/edit/agent/chat");
expect(html).toContain("/decks/sample/edit/apply");
```

- [ ] **Step 3: Run sample and local-dev tests**

Run:

```bash
bun test test/local-dev-app.test.ts test/worker-sample.test.ts
```

Expected: tests pass after any sample route hardcoding is updated.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/index.ts test/local-dev-app.test.ts test/worker-sample.test.ts
git commit -m "test: update sample routes for edit workspace"
```

---

### Task 4: Documentation And Compatibility Notes

**Files:**
- Modify: `README.md`
- Modify: `test/router.test.ts`

- [ ] **Step 1: Add one explicit compatibility test**

In `test/router.test.ts`, keep compatibility visible and constrained.

```ts
it("redirects the deprecated presentation route to the render route", async () => {
  const app = new Hono();
  app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

  const response = await app.request("/slides/deck1/presentation");

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/slides/deck1/render");
});
```

- [ ] **Step 2: Update README route table**

Replace old route descriptions with:

```md
- `GET /slides/:slug` は公開 viewer。1920x1080 の render page を iframe で表示し、Prev / Next / Full と click / keyboard 操作だけを提供します。
- `GET /slides/:slug/render` は固定 1920x1080 の実レンダリングページです。
- `GET /slides/:slug/edit` は development-only の編集、Agent chat、Apply、preview controller ページです。
- `POST /slides/:slug/edit/save` は raw MDX 保存です。
- `GET /slides/:slug/edit/events` は preview event stream です。
- `POST /slides/:slug/edit/agent/chat` は Agent への chat/proposal request です。
- `POST /slides/:slug/edit/apply` は proposal を raw MDX に適用します。
```

Add a migration note:

```md
`/:slug/presentation` は互換性のため `/:slug/render` へ redirect します。新しい UI、docs、sample は `/:slug/render` を使います。
```

- [ ] **Step 3: Run docs-sensitive tests**

Run:

```bash
bun test test/router.test.ts test/local-dev-app.test.ts test/worker-sample.test.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit Task 4**

```bash
git add README.md test/router.test.ts
git commit -m "docs: document viewer and edit route split"
```

---

### Task 5: Full Verification

**Files:**
- No planned source changes.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
bun test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run the project check**

Run:

```bash
bun run check
```

Expected: TypeScript/build checks pass. If this command invokes Wrangler and writes logs outside the sandbox, rerun only with the user's approval for the required filesystem scope.

- [ ] **Step 3: Browser smoke test the sample**

Run the local Worker:

```bash
bun run dev
```

Open and verify:

```text
http://localhost:8791/decks/sample
http://localhost:8791/decks/sample/render
http://localhost:8791/decks/sample/edit
```

Expected:

- `/decks/sample` shows the iframe viewer with Prev, Next, Full only.
- `/decks/sample` has no chat panel and no Presentation link.
- `/decks/sample/render` shows the actual deck at 1920x1080.
- `/decks/sample/edit` shows editor, Agent chat, Apply, preview iframe, and Presentation/open-render control.
- Chat proposals do not persist until Apply calls `/decks/sample/edit/apply`.

- [ ] **Step 4: Close the beads issue**

After code and docs are committed and verified, run:

```bash
bd close <issue-id> --reason="Implemented public viewer, render route, and edit-scoped controls"
```

- [ ] **Step 5: Push only when authentication is available**

Run:

```bash
git status
git pull --rebase
git push
```

Expected: branch is up to date with origin. If GitHub authentication is still invalid, stop and report the auth blocker.

---

## Self-Review

- Spec coverage: `/:slug` is public viewer-only, `/:slug/render` is actual rendering, `/:slug/edit` owns editor/chat/controller, production has no chat, and sample remains a practical working demo.
- Placeholder scan: No placeholder instructions remain; every route and command is explicit.
- Boundary check: Hono still owns apply/save persistence; Agent chat only creates proposals.
- Compatibility check: `/:slug/presentation` is not visible in UI/docs except the migration note and compatibility test.
- Package manager check: all test and verification commands use `bun`.
