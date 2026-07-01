# Presenter Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the presenter route as a safe, usable presentation workflow with clear UI affordances and predictable developer configuration.

**Architecture:** Keep the presenter feature owned by `@hono/decks` router and renderer surfaces. Tighten the route/config contract first, then improve the presenter document UI without introducing a new client framework or remote synchronization layer.

**Tech Stack:** TypeScript, Hono, `@hono/decks` renderer/router modules, Vitest, Wrangler sample configuration.

---

## Current Problems

- Presenter is technically available, but the UI is still a minimal split view rather than a full presenter tool.
- Presenter route exposure depends on app config and runtime flags, but the safe default and env-value handling are not yet polished.
- Viewer control insertion has DX edge cases: disabled controls still resolve presenter state, and custom `items` control lists do not receive the presenter link automatically.
- Speaker notes are displayed as escaped plain text, which is safe but limited for real talk notes.

## Task 1: Fix Presenter Safety And Config Footguns

**Files:**
- Modify: `packages/decks/src/server/router.ts`
- Modify: `examples/basic/src/decks.config.ts`
- Test: `packages/decks/test/router.test.ts`
- Test: `examples/basic/test/worker-sample.test.ts`

- [ ] **Step 1: Write failing router tests for safe defaults and disabled controls**

Add tests that prove:

```ts
it("does not resolve presenter control when viewer controls are disabled", async () => {
  const app = new Hono();
  let calls = 0;
  app.route(
    "/slides",
    decksRouter({
      source: manifestDeckSource({ decks: [deck] }),
      viewer: { controls: false },
      presenter: {
        enabled: () => {
          calls += 1;
          return true;
        },
        viewerControl: true,
      },
    }),
  );

  const response = await app.request("/slides/deck1");
  expect(response.status).toBe(200);
  expect(calls).toBe(0);
});
```

Also add a test for the chosen secure default:

```ts
it("keeps presenter route disabled when presenter is explicitly false", async () => {
  const app = new Hono();
  app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), presenter: false }));

  expect((await app.request("/slides/deck1/presenter")).status).toBe(404);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
```

Expected: the disabled-controls resolver test fails until `resolveViewerControls()` returns before resolving presenter state.

- [ ] **Step 3: Implement minimal router fix**

In `resolveViewerControls()`, return immediately when viewer controls are disabled:

```ts
const controls = options.viewer?.controls;
if (controls === false) return false;
const presenterControl = await resolvePresenterViewerControl(c, options, deck, slug, mountPath);
```

Keep the existing `presenter === false` behavior for route gating. Do not change the default route behavior in this task unless the project explicitly decides to make presenter opt-in.

- [ ] **Step 4: Support string env values in the sample**

Update the sample presenter gate so both boolean and string values work:

```ts
function truthyBinding(value: unknown): boolean {
  return value === true || value === "true";
}
```

Use it for both `DECK_RUNTIME_DEV` and `DECK_PRESENTER_ENABLED`.

- [ ] **Step 5: Verify**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run examples/basic/test/worker-sample.test.ts
```

Expected: all tests pass.

## Task 2: Improve Presenter UI Controls And Status

**Files:**
- Modify: `packages/decks/src/renderer/presentation-page.ts`
- Test: `packages/decks/test/router.test.ts`

- [ ] **Step 1: Write failing renderer assertions**

Extend the presenter route test to assert the rendered HTML includes:

```ts
expect(presenterHtml).toContain("data-hono-decks-presenter-controls");
expect(presenterHtml).toContain("data-action=\"previous\"");
expect(presenterHtml).toContain("data-action=\"next\"");
expect(presenterHtml).toContain("data-hono-decks-presenter-position");
expect(presenterHtml).toContain("data-hono-decks-presenter-clock");
expect(presenterHtml).toContain("data-hono-decks-presenter-connection");
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
```

Expected: the test fails because presenter controls and status elements do not exist yet.

- [ ] **Step 3: Add presenter controls markup**

Add a compact control bar above or below the current-slide iframe:

```html
<nav class="hono-decks-presenter-controls" data-hono-decks-presenter-controls aria-label="Presenter controls">
  <button type="button" data-action="previous">Back</button>
  <span data-hono-decks-presenter-position>1 / ${deck.slides.length}</span>
  <button type="button" data-action="next">Next</button>
  <span data-hono-decks-presenter-clock>00:00</span>
  <span data-hono-decks-presenter-connection>Connected</span>
</nav>
```

Keep labels plain English for package defaults. App-level customization can come later.

- [ ] **Step 4: Wire controls to the projection iframe**

In the presenter script:

```js
const frame = document.querySelector("[data-hono-decks-presenter-current] iframe");
document.querySelectorAll("[data-action='previous']").forEach((button) => {
  button.addEventListener("click", () => frame?.contentWindow?.postMessage({ type: "hono-decks:command", action: "previous" }, window.location.origin));
});
document.querySelectorAll("[data-action='next']").forEach((button) => {
  button.addEventListener("click", () => frame?.contentWindow?.postMessage({ type: "hono-decks:command", action: "next" }, window.location.origin));
});
```

Update `data-hono-decks-presenter-position` from incoming `hono-decks:state`.

- [ ] **Step 5: Verify**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
```

Expected: presenter route tests pass and existing projection behavior remains unchanged.

## Task 3: Harden Presenter Message Handling

**Files:**
- Modify: `packages/decks/src/renderer/presentation-page.ts`
- Test: `packages/decks/test/router.test.ts`

- [ ] **Step 1: Write failing assertions for origin/source checks**

Assert the presenter script contains:

```ts
expect(presenterHtml).toContain("event.source !== frame?.contentWindow");
expect(presenterHtml).toContain("event.origin !== window.location.origin");
```

- [ ] **Step 2: Add message guard**

In the presenter `message` event listener, ignore unrelated windows and origins:

```js
if (event.source !== frame?.contentWindow) return;
if (event.origin !== window.location.origin) return;
```

Keep the existing `message.type === "hono-decks:state"` check after the source/origin checks.

- [ ] **Step 3: Verify**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
```

Expected: message-hardening assertions pass.

## Task 4: Document Presenter Configuration

**Files:**
- Modify: `README.md`
- Modify: `docs/verification-priorities.md`
- Test: no automated code test required

- [ ] **Step 1: Add presenter route guidance**

Document:

- `presenter: false` disables the route.
- `presenter.enabled` receives `{ c, deck, slug, mountPath, dev, presenterPath, presentationPath }`.
- Production deployments should gate presenter if speaker notes are private.
- `viewer.controls.items` fully owns control rendering, so automatic presenter link insertion only applies to default `before`/`after` controls.

- [ ] **Step 2: Add sample runtime dev note**

Document the sample pattern:

```ts
router: {
  dev: (c) => truthyBinding(c.env.DECK_RUNTIME_DEV),
  presenter: {
    enabled: ({ c, dev }) => dev || truthyBinding(c.env.DECK_PRESENTER_ENABLED),
  },
}
```

- [ ] **Step 3: Verify documentation scope**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

## Task 5: Full Verification And Commit

**Files:**
- Commit all files intentionally changed by Tasks 1-4.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test/router.test.ts
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run examples/basic/test/worker-sample.test.ts examples/basic/test/dev-scripts.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 2: Run package test suite**

Run:

```powershell
C:\Users\owner\.bun\bin\bun.exe node_modules\vitest\vitest.mjs run packages/decks/test
```

Expected: all package tests pass.

- [ ] **Step 3: Confirm no generated artifact noise**

Run:

```powershell
git status --short
git diff --stat -- examples/basic/src/generated
```

Expected: no generated slide files are dirty unless a task intentionally changed generator output and tests were updated accordingly.

- [ ] **Step 4: Commit**

Run:

```powershell
git add packages/decks/src/renderer/presentation-page.ts packages/decks/src/server/router.ts packages/decks/test/router.test.ts examples/basic/src/decks.config.ts examples/basic/test/worker-sample.test.ts README.md docs/verification-priorities.md
git commit -m "feat: improve presenter workflow"
```

Expected: commit succeeds with only presenter-related changes.

- [ ] **Step 5: Push**

Run:

```powershell
git pull --rebase
git push
git status --short --branch
```

Expected: final status is clean and synced with `origin/main`.
