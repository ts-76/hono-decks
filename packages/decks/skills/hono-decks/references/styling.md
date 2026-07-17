# Styling

Use this route for deck-local `theme.css`, layout decisions, typography, visual hierarchy, animation, and overflow correction.

## Canvas contract

hono-decks renders a fixed 1920 × 1080 design canvas with a 16:9 aspect ratio and scales it into the viewer. Do not build responsive slide breakpoints. Style the canvas itself, then verify the scaled result and print route.

The base root font size is 32px. Treat that as body copy, not a value to shrink globally. A practical hierarchy is:

- body: `1rem` (32px)
- supporting text: no smaller than `.75rem` (24px)
- slide title: `1.75rem` to `2.5rem`
- cover title: `3rem` to `5rem`
- line height: about `1.15` for headings and `1.35` to `1.5` for body text

## Start with deck-scoped CSS

Create `decks/product/theme.css`:

```css
:root {
  --hono-decks-color: #f7f8fb;
  --hono-decks-muted-color: #c3c8d4;
  --hono-decks-accent-color: #8bd3ff;
  --hono-decks-border-color: rgba(255, 255, 255, 0.2);
  --hono-decks-card-background: rgba(12, 18, 34, 0.82);
  --hono-decks-inline-code-background: rgba(12, 18, 34, 0.72);
  --hono-decks-code-background: #0a1020;
}

.layout-cover,
.layout-default,
.layout-statement,
.layout-comparison {
  background: #080d1a;
  color: var(--hono-decks-color);
}

.slide h1,
.slide h2 {
  margin: 0 0 0.65em;
  max-width: 18ch;
  line-height: 1.08;
  letter-spacing: -0.025em;
}

.slide p,
.slide li {
  line-height: 1.42;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: stretch;
}

.comparison-card {
  min-width: 0;
  border: 1px solid var(--hono-decks-border-color);
  border-radius: 20px;
  background: var(--hono-decks-card-background);
  padding: 1.25rem;
}
```

Use explicit semantic classes in MDX:

```mdx
---
layout: comparison
---

## Build and runtime

<div class="comparison-grid">
  <section class="comparison-card">
    <h3>Build</h3>
    <p>Compile MDX with Node.js or Bun.</p>
  </section>
  <section class="comparison-card">
    <h3>Runtime</h3>
    <p>Serve generated modules from Hono.</p>
  </section>
</div>
```

Do not assume UnoCSS or Tailwind utility classes exist.

## Readability and density rules

- Prefer 20–40 visible words for a typical slide; use more only when the layout is deliberately text-led.
- Keep lists to about 3–6 short items. Split a long sequence across slides.
- Use at most two primary columns. More columns usually force unreadable type.
- Keep code examples focused on the lines needed to explain the idea. Use `CodeBlock` or fenced code, both of which scroll instead of enlarging the canvas.
- Use images and diagrams at a size that can be interpreted from the back of a room; remove decorative detail before reducing text.
- Maintain strong foreground/background contrast and never communicate state by color alone.

## Prevent overflow

The slide intentionally uses `overflow: hidden`. Hidden content is a failure, not an invitation to add scrolling.

When content overflows, fix it in this order:

1. Remove repetition and shorten prose.
2. Split the content into two slides.
3. Replace a dense table with a focused comparison or chart.
4. Reduce gaps or decorative padding modestly.
5. Reduce a local type size only when it remains at least 24px.

Avoid global transforms, `zoom`, negative margins that pull content outside the safe area, and font sizes chosen only to make one crowded slide fit.

## Motion

Built-in slide transitions and Fire reveals already respect `prefers-reduced-motion`. Custom animation must do the same:

```css
.signal-dot {
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    transform: scale(1.08);
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  .signal-dot {
    animation: none;
  }
}
```

Animation should clarify sequence or change. Do not animate every object or make critical information depend on motion.

## Visual QA

Inspect every slide in the viewer and check:

- no clipped headings, lists, code, images, or footers
- body text remains readable when the 1920 × 1080 canvas is scaled down
- titles and key claims dominate the hierarchy
- repeated layouts align consistently
- images retain aspect ratio and meaningful content is not cropped
- Fire states remain understandable at each reveal step
- print preview contains every slide and does not depend on live embeds
- custom motion has a reduced-motion fallback
