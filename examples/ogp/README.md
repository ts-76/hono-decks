# Build-time OGP example

This example creates one 1200×630 PNG per deck during the normal build. It does not launch a browser and does not add image-generation code to the Worker runtime.

## Why these dependencies are local

- `satori` turns a small JSX card into SVG.
- `@resvg/resvg-js` rasterizes that SVG to PNG.
- `hono-decks` itself has neither dependency. Projects that do not generate OGP images pay no install or build cost for them.

The bundled Atkinson Hyperlegible OTF files are loaded from `assets/fonts/`, so builds do not fetch remote assets. Satori accepts TTF, OTF, or WOFF fonts, but not WOFF2. Replace both font files and the two `fonts` entries in `scripts/ogp-card.tsx` when the card needs Japanese or another unsupported character set.

## Flow

1. `scripts/compile.ts` calls the public `compileDecks()` Node API and receives the compiled manifest.
2. Title, description, author, and slug are read from each non-draft deck.
3. `createDeckPaths(mountPath, slug).ogImage` selects the output path, such as `public/decks/welcome/og.png`.
4. Satori and resvg create the PNG only when its bytes changed.
5. Wrangler Static Assets serves that file, while `viewer.openGraph: true` emits absolute Open Graph and Twitter Card metadata from the same path map.

`build.ogpCacheFile` is unrelated: it caches metadata fetched for `@[card](...)` link cards inside slides. This example generates the deck viewer's own share image.

## Run it

```bash
bun run decks:compile
bun run dev
```

Open `/decks/welcome` and inspect `/decks/welcome/og.png`. `bun run check` also verifies the PNG signature and dimensions, type-checks the Worker and build script, and performs a Wrangler dry run.

Wrangler watches `decks`, `scripts`, and `assets/fonts`. The custom build regenerates both deck modules and OGP files; `--live-reload` refreshes the browser after a successful rebuild.
