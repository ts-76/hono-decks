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
| Installed documentation components and their static default styles | `app/components/` |
| Interactive code blocks, tabs, and code groups | `app/islands/` |
| Color, type, spacing, radius, and state tokens | `public/tokens.css` |
| Shared shell, Markdown, interactive-component, and theme styles | `public/style.css`, `public/components.css` |
| Application chrome (header, mobile menu, footer, deployment button) | `app/site.css` |
| Application integration and homepage composition | `app/style.css`, `app/home.css` |

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

Customize shared styling through semantic tokens in `public/tokens.css`. Static component defaults live beside their markup in `app/components/*.tsx`, using `hono/css`. The custom documentation and homepage shells each render one `<Style />` in the head, before the application stylesheet, so only the static component families rendered by that request emit CSS. Keep class values as `componentClass` results; stringifying them loses the SSR callbacks.

The shared sheets `public/style.css` and `public/components.css` retain shell/Markdown typography, tabs, code groups, code controls, syntax highlighting, and theme controls. This site declares `documentation` before `application` in `app/style.css`. Copied component CSS deliberately wraps its defaults in `@layer documentation` too: placing these defaults outside all layers would override the existing layered application styles regardless of source order. Preserve this wrapper during future template merges.

`app/style.css` contains application integration rules, while `app/site.css` owns the shared header, mobile menu, footer, and deployment button. Homepage composition in `app/home.css` is scoped under `.home`, so it cannot change documentation gutters, tables, or responsive breakpoints. Both surfaces use the same light/dark token palette.

## Upgrade honoxpress

This repository's documentation app pins `honoxpress@0.4.0` in `docs/package.json`. This is an existing-app dependency, not the recommended version for a new site; use the [current honoxpress setup guide](https://github.com/ts-76/honoxpress/blob/main/docs/components.md#start-a-new-site) for new projects. Updating the dependency does not update the copied application files, and `init` / `add` are not upgrade commands. Follow the [owned-template upgrade guide](https://github.com/ts-76/honoxpress/blob/v0.4.0/docs/upgrading-owned-templates.md) and [static-style migration guide](https://github.com/ts-76/honoxpress/blob/v0.4.0/docs/migrating-static-component-styles.md), comparing the installed package's templates with the copied components and shared sheets before merging changes.

The 0.4.0 upgrade preserves the 0.2.1 fixes for theme-selector spacing, stable navigation wrapping, long code filenames, and adjacent API separators. It moves the seven static component template families into `hono/css`, removes their duplicate shared defaults, and adopts the idempotent theme initializer and `syncThemeSwitches()` after HonoX hydration. Keep the custom shell, header, mobile disclosures, query-based language URLs, Markdown table scroll containers, and footer behavior when updating. Keep the theme selector's JSX and CSS together. The custom `DocsLayout` forwards an optional CSP nonce to both `ThemeScript` and `Style`.

Existing guides remain MDX compiled to Hono JSX at build time. The new parser-neutral `honoxpress/markdown` adapter and framework-owned `DocsFrame` are optional integration APIs; adopting them is not required for this HonoX site's routes or custom shell. The installation manifest retains the CLI's original file fingerprints; manually merged files are application-owned, not pristine upstream copies.

After an upgrade, run `bun run --cwd docs check` and inspect every English and Japanese guide plus `/api` at desktop and mobile widths in light and dark themes. Check theme persistence, mobile menu and TOC controls, code copying, navigation wrapping, and page-wide overflow. Wide tables and code should scroll within their own containers.
