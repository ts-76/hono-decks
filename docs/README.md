# Documentation site

The public documentation runs on HonoX and honoxpress. Guides and the API reference are compiled from MDX to Hono JSX during development and builds. The Cloudflare Worker serves those compiled modules; it does not run an MDX compiler or read source files at request time.

## Local development

From the repository root:

```sh
bun install --frozen-lockfile
bun run dev:docs
```

Use the URL printed by Vite. Existing scripts also compile the example deck used by the documentation.

```sh
bun run --cwd docs check  # Documentation types, request tests, and client/Worker builds
bun run check             # Repository-wide checks
bun run deploy:docs       # Build and deploy the documentation Worker
```

## Where to make changes

| Purpose | Location |
| --- | --- |
| Site name, default language, supported languages, navigation labels, theme switch, and footer | `app/docs.config.ts` |
| English guides and API reference | `app/content/docs/*.mdx` |
| Japanese translations | `app/content/ja/docs/*.mdx` |
| Navigation, translations, and public URL adaptation | `app/docs-catalog.ts` |
| Shared documentation shell | `app/components/docs-layout.tsx` |
| Components available inside MDX | `app/mdx-components.ts` |
| Installed documentation components | `app/components/` |
| Interactive code blocks, tabs, and code groups | `app/islands/` |
| Color, type, spacing, radius, and state tokens | `public/tokens.css` |
| Shared documentation/component styles | `public/style.css`, `public/components.css` |
| Application overrides and homepage styles | `app/style.css`, `app/home.css` |

Paths in this table are relative to `docs/`. The slide examples remain in `decks/`; documentation MDX belongs in `app/content/`.

## Add or edit a page

Create an English document at `app/content/docs/my-guide.mdx`:

```mdx
---
title: My guide
description: What readers will learn.
order: 8
---

# My guide

## First step

Write ordinary Markdown and use shared components where they improve the explanation.

<Callout type="info" title="Before you start">
Prepare a running Hono application.
</Callout>
```

The filename determines the slug. This example is served at `/docs/my-guide`; frontmatter determines its navigation label, summary, and position. Level-two and level-three headings populate the table of contents. Preserve an existing `<section id="...">` when changing a page that already has public links to that anchor.

Add the Japanese version under `app/content/ja/docs/my-guide.mdx` with the same slug. The catalog discovers both files automatically and only offers language links for translations that exist. This site retains query-based URLs such as `/docs/my-guide?lang=ja`, and still resolves language from the query, cookie, or request header. English is the fallback configured in `app/docs.config.ts`. The API reference is stored as `api.mdx` in each language and keeps its existing public `/api` URL.

## Use and customize components

Components registered in `app/mdx-components.ts` can be used in MDX without per-page imports. The installed set includes callouts, cards, steps, accordions, tabs, code groups, figures, file trees, type tables, definition lists, API references, demo frames, and theme controls. `MarkdownTable` contains wide Markdown tables inside their own horizontal scroll area. `DeployToCloudflare` is an application-specific component.

Use fenced code blocks for ordinary examples. Use `CodeBlock` when a filename, translated copy labels, or an exact code string is needed. honoxpress adds syntax tokens during the build, and HonoX hydrates the copy control in the browser.

The component files are owned by this application. They were installed by the honoxpress CLI, and `.honoxpress.json` records the installed groups and original file hashes. To add another supported group, run the CLI from `docs/` and inspect its proposed changes:

```sh
bun run honoxpress add <group>
```

Customize shared styling through semantic tokens in `public/tokens.css` and application overrides in `app/style.css`. The homepage has its own lower-priority CSS layer; documentation and the homepage share the same light/dark token palette.
