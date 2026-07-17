# OGP and social image generation

Use this route when the request explicitly asks to generate Open Graph or social sharing images.

hono-decks exposes OGP paths and metadata but intentionally does not bundle an image renderer. Generate 1200 × 630 PNGs at build time and serve them from Workers Static Assets or another application-owned asset pipeline.

## Enable viewer metadata

```ts
// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
  router: {
    viewer: {
      openGraph: true,
    },
  },
});
```

The default image URL is `decks.paths(slug).ogImage`. The viewer turns it into an absolute Open Graph and Twitter Card URL from the request origin.

## Build-time pipeline

Use `compileDecks()` from `hono-decks/node`, then generate one image for each non-draft manifest entry:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createDeckPaths } from "hono-decks";
import { compileDecks } from "hono-decks/node";
import config from "../hono-decks.config";
import { renderOgpCard } from "./ogp-card";

const cwd = process.cwd();
const manifest = await compileDecks({
  cwd,
  root: config.build?.root ?? "decks",
  out: config.build?.outDir ?? "src/generated",
  mountPath: config.mountPath,
  ogpCacheFile: config.build?.ogpCacheFile,
});

for (const deck of manifest.decks) {
  if (deck.meta.draft) continue;
  const paths = createDeckPaths(config.mountPath, deck.slug);
  const png = await renderOgpCard({
    title: deck.meta.title ?? deck.slug,
    description: deck.meta.description,
    author: deck.meta.author,
    path: paths.viewer,
  });
  const output = join(cwd, "public", paths.ogImage.replace(/^\//, ""));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, png);
}
```

Implement `renderOgpCard` with application-selected tooling such as Satori plus resvg. Keep those dependencies in the application, not the hono-decks runtime bundle.

Satori accepts TTF, OTF, and WOFF fonts, but not WOFF2. Bundle fonts that cover every language used in deck metadata; builds should not depend on fetching remote fonts.

## Separate concepts

- `router.viewer.openGraph`: emits social metadata for the viewer
- `decks.paths(slug).ogImage`: canonical image output/serving path
- `build.ogpCacheFile`: caches external page metadata for `@[card](...)`; it does not generate the deck share image

## Verification

- generate only non-draft decks
- output exactly 1200 × 630 PNG files
- avoid rewriting unchanged bytes so local watchers do not loop
- verify the viewer emits absolute `og:image` and Twitter Card metadata
- request the generated image path from the deployed asset setup
- use an `imagePath` resolver when images live on a separate CDN
- ensure titles, descriptions, and fonts fit languages with wider glyphs

The repository's `examples/ogp` directory is the canonical complete recipe.
