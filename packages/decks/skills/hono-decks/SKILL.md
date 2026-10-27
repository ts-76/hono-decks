---
name: hono-decks
description: >
  Create, style, integrate, and troubleshoot hono-decks presentations in Hono and Cloudflare Workers. Load for installation, Markdown and MDX deck authoring, Fire reveals, theme.css, generated createDecks modules, Hono routing, Vite or Wrangler builds, R2 assets, PDF or PNG export, OGP generation, embeds, or custom DeckSource pipelines.
---

# hono-decks

Use this skill as a router. Inspect the application and the request, then read only the relevant reference files before editing. Combine routes when a request spans topics.

## Route the request

| User intent | Read |
| --- | --- |
| Install, initialize, first deck, compile failure | [Getting started](references/getting-started.md) |
| Write or fix `deck.mdx` or adapter-backed `deck.md`, frontmatter, Fire, embeds, components, notes | [Authoring MDX](references/authoring-mdx.md) |
| Create or improve `theme.css`, layout, typography, visual quality, overflow | [Styling](references/styling.md) |
| Add to an existing Hono, HonoX, Vite, Wrangler, or Worker app; configure routes, presenter, or external embed | [Integrating](references/integrating.md) |
| Serve deck images or other local assets from R2 | [R2 assets](references/r2-assets.md) plus [Integrating](references/integrating.md) |
| Generate PDF or PNG with Cloudflare Browser Rendering | [Browser export](references/browser-export.md) plus [Integrating](references/integrating.md) |
| Generate OGP/social images | [OGP generation](references/ogp-generation.md) |
| Use a manifest, database, remote store, custom `DeckSource`, or low-level router | [Custom sources](references/custom-sources.md) |

If the request is simply “make a deck,” read Authoring MDX and Styling. If it also asks to put the deck in an application, read Integrating. Do not load the advanced references unless the request or inspected code needs them.

## Non-negotiable architecture

1. Compile deck sources with Node.js or Bun during development or build, never in the Worker runtime.
2. For Vite integrations use `virtual:hono-decks`; for the CLI/file workflow import generated TypeScript modules.
3. Keep `hono-decks.config.ts` as the single mount-path and build configuration.
4. Use the framework integration to register routes, or mount manually with `app.route(decks.mountPath, decks.router())`. Obtain URLs from `decks.paths(slug)` or `meta.paths`.
5. Edit source decks, deck-local components, assets, and themes. Never hand-edit the generated output directory.

## Authoring and design defaults

- hono-decks is not Slidev. Never generate `v-click`, Slidev frontmatter, or UnoCSS utility classes unless the application independently installed and configured those features.
- Use supported `:::fire` blocks, `<Fire>` groups in MDX, or block-level custom components with `fire`; reveals follow source order.
- Design for the fixed 1920 × 1080, 16:9 canvas. Responsive slide layouts are not required.
- Keep body text presentation-sized (the base root size is 32px), preserve strong contrast, and keep every slide inside the canvas.
- Prefer one idea per slide. Split dense content instead of shrinking text or relying on hidden overflow.
- Preserve print behavior and respect `prefers-reduced-motion` for custom animation.

## Common mistakes

### Editing generated modules

Wrong:

```ts
// src/generated/decks.ts
// Hand-edit the generated manifest or routes.
```

Correct: edit the deck source, `theme.css`, assets, or components. Vite integrations compile automatically; run `hono-decks compile` for the CLI/file workflow.

### Compiling inside the Worker

Wrong:

```ts
import { compileDecks } from "hono-decks/node";

app.get("/decks", async (c) => c.json(await compileDecks({ cwd: "." })));
```

Correct:

```ts
import { decks } from "./decks";

app.route(decks.mountPath, decks.router());
```

### Duplicating route strings

Wrong:

```ts
app.route("/slides", decks.router());
const presenter = `/decks/${slug}/presenter`;
```

Correct:

```ts
app.route(decks.mountPath, decks.router());
const presenter = decks.paths(slug).presenter;
```

### Passing executable values to client islands

Wrong:

```mdx
<Counter onChange={() => save()} startedAt={new Date()} />
```

Correct:

```mdx
<Counter label="Votes" initial={3} />
```

Keep event handlers, dates, class instances, and component state inside `components/client/index.tsx`; island props must be JSON-serializable.

### Using unsupported Fire forms

Wrong:

```mdx
<p fire="fade-up">Reveal me</p>
<Fire order={2}>Later</Fire>
```

Correct:

```mdx
:::fire{effect="fade-up"}
Reveal me
:::

<Chart fire="scale" at="+1" />
```

### Treating iframe embedding as CORS

Wrong: add `Access-Control-Allow-Origin` and leave `router.embed` without a parent policy.

Correct:

```ts
router: {
  embed: { frameAncestors: ["https://blog.example.com"] },
}
```

Iframe navigation uses CSP `frame-ancestors`, not CORS.

### Publishing unprotected browser exports

Wrong:

```ts
export: {
  browser: ({ c }) => c.env.BROWSER,
  pdf: true,
}
```

Correct: add an `authorize` resolver backed by a Wrangler secret. Export authorization defaults to allowed when the resolver is absent.

### Generating Slidev or UnoCSS syntax

Wrong:

```mdx
<div v-click class="grid grid-cols-2 gap-4">Content</div>
```

Correct: use `:::fire` and define project-specific classes explicitly in `theme.css`.

## Verification

After changes:

1. Run the application build; use `hono-decks compile` explicitly for the CLI/file workflow.
2. Run the application's typecheck and tests.
3. Open the viewer and check every slide at 16:9 for readable text and overflow.
4. Check presentation, presenter, print, embed, export, or OGP routes that the change affects.
5. Verify production policies for drafts, presenter access, CSP `frame-ancestors`, and export authorization.
