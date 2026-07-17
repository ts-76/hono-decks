# R2-backed assets

Use this route only when the request explicitly asks to serve deck-local images or other assets from Cloudflare R2.

Compilation still discovers and rewrites local asset URLs. `withR2Assets` decorates the generated source so requests prefer R2 and fall back to the original embedded asset source.

## Configure a binding

```jsonc
{
  "r2_buckets": [
    {
      "binding": "DECK_ASSETS",
      "bucket_name": "production-deck-assets"
    }
  ]
}
```

Generate binding types with `wrangler types`.

## Decorate the source

```ts
// hono-decks.config.ts
import {
  defineDecksConfig,
  withR2Assets,
  type DeckSource,
  type R2BucketLike,
} from "hono-decks";

interface Env {
  Bindings: {
    DECK_ASSETS?: R2BucketLike;
  };
}

export default defineDecksConfig<Env>({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
  source(source: DeckSource<Env>) {
    return withR2Assets(source, {
      bucket: (c) => c.env.DECK_ASSETS,
      keyPrefix: "slides",
      cacheControl: "public, max-age=31536000, immutable",
    });
  },
});
```

By default the R2 key comes from the compiled asset's source path, optionally prefixed by `keyPrefix`. If the upload pipeline uses a different layout, provide a deterministic key resolver:

```ts
source(source: DeckSource<Env>) {
  return withR2Assets(source, {
    bucket: (c) => c.env.DECK_ASSETS,
    key: ({ slug, assetPath }) => `decks/${slug}/${assetPath}`,
    cacheControl: ({ asset }) =>
      asset.publicPath.includes("/versioned/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300",
  });
}
```

## Operational requirements

- Upload the same paths that the key resolver produces; `withR2Assets` only reads objects.
- Set correct R2 HTTP metadata, especially `contentType`. The decorator falls back to the compiled asset type when needed.
- Use immutable caching only for versioned or content-addressed keys.
- Keep the generated fallback if local development must work without an R2 binding.
- Test a present object, missing object, and missing binding. Missing R2 data should fall back to the underlying source.
- Do not replace slide image URLs with arbitrary public R2 URLs unless bypassing hono-decks asset routes is an explicit requirement.
