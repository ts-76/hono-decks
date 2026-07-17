# Authoring MDX

Use this route when writing or correcting a `deck.mdx` file. Start with the basic syntax, then load the advanced sections only when the requested deck needs them.

## Basic deck structure

The first frontmatter block describes the deck. Each following `---` boundary starts a slide; a slide may immediately include its own frontmatter.

```mdx
---
title: Product update
description: What changed and why it matters
author: Product team
date: 2026-07-17
tags: [product, engineering]
theme: default
transition: fade
transitionDuration: 300ms
transitionEasing: ease-out
draft: false
presenter: true
---

---
title: Opening
layout: cover
class: opening-slide
background: "#0b1020"
---

# Product update

One clear sentence that frames the talk.

{/* Introduce the customer problem before the feature. */}

---
title: Outcomes
layout: default
transition: slide-left
---

## Outcomes

- Faster setup
- Fewer production surprises
- Clearer ownership
```

Deck frontmatter supports `title`, `description`, `author`, `date`, `tags`, `theme`, `transition`, `transitionDuration`, `transitionEasing`, `assets`, `draft`, and `presenter`.

Slide frontmatter supports `title`, `layout`, `class`, `notes`, `background`, `transition`, `transitionDuration`, and `transitionEasing`. Unknown keys are preserved in `meta` and produce a compile warning.

Supported transitions are `none`, `fade`, `fade-out`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, and `view-transition`.

## Markdown and MDX basics

Use headings, paragraphs, emphasis, links, images, blockquotes, ordered and unordered lists, task lists, tables, inline code, and fenced code. GFM is enabled.

~~~mdx
## Release checklist

- [x] Compile the deck
- [ ] Verify the print route

| Surface | Path |
| --- | --- |
| Viewer | `/decks/product` |
| Presenter | `/decks/product/presenter` |

```ts
app.route(decks.mountPath, decks.router())
```

![Architecture](./assets/architecture.svg)
~~~

Local image paths are rewritten during compilation. Put deck-local files under `assets/` and use relative paths.

MDX exports, expressions, and JSX are supported:

```mdx
export const release = "2026.07"
export const metrics = ["42% faster", "3 fewer steps"]

## Release {release}

{metrics.map((metric) => <Badge label={metric} />)}
```

## Speaker notes

Use the slide `notes` frontmatter field or MDX comments. Comments are removed from visible slide output and collected as presenter notes.

```mdx
---
notes: |
  Pause after the headline.
  Explain the build/runtime boundary.
---

## Compile once, serve everywhere

{/* Open the presenter route before the live demo. */}
```

## Built-in components

- `<Hero>`: `title`, `subtitle` or `description`, `eyebrow`, `image` or `src`, and `featured`
- `<CodeBlock>`: `lang`, `filename` or `title`, and `highlight`
- `<EmbedFrame>`: iframe with sandbox, fallback, and print behavior
- `<SocialEmbed>`, `<TweetEmbed>`, and `<LinkCard>`: social and link surfaces
- `<Fire>`: explicit reveal wrapper; prefer the Markdown directive for ordinary prose

```mdx
<Hero
  eyebrow="Architecture"
  title="Build-time MDX"
  subtitle="Generated modules run on the Worker"
  image="./assets/pipeline.svg"
/>

<CodeBlock lang="ts" filename="src/index.ts" highlight="4">
import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();
app.route(decks.mountPath, decks.router());
</CodeBlock>
```

## Fire reveals

Markdown content uses a container directive:

```mdx
:::fire{effect="fade-up"}
This appears on the next reveal step.
:::
```

Lists can reveal items in source order:

```mdx
:::fire{each="item" depth="2" every="1"}
- First point
  - Nested detail
- Second point
:::
```

Block-level custom components may use `fire` and `at`:

```mdx
<MetricCard fire="scale" at="+1" label="Activation" value="42%" />
```

`at` accepts a non-negative integer or a relative value such as `+1`. Do not use `$fire`, `order`, `v-click`, or `fire` on HTML elements or inline custom components.

## Embeds and link cards

```mdx
@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

@[x](https://x.com/honojs/status/1659577874821836801)

@[card](https://hono.dev/)

@[embed](https://example.com/embed/status)
```

`@[card]` metadata is resolved at compile time when available. `build.ogpCacheFile` stores that external metadata cache; it is not the deck's social share image.

## Deck-local components

Use this structure:

```text
decks/product/
  deck.mdx
  theme.css
  assets/
    diagram.svg
  components/
    index.tsx
    client/
      index.tsx
```

`components/index.tsx` contains server-rendered Hono JSX components. Mark a component as client-enabled in the server registry and export its browser implementation with the same name from `components/client/index.tsx`.

Client props may contain only strings, finite numbers, booleans, `null`, arrays, and plain objects composed from those values. Keep callbacks and interactive state in the client component.

## Authoring quality check

- Use a short title and one primary idea per slide.
- Keep visible body copy sparse enough for a 32px base size.
- Split long lists, large tables, and multi-screen code into multiple slides.
- Add useful alt text to images and titles to embeds.
- Compile after syntax changes and resolve all warnings instead of hiding them.
