# Custom sources and low-level APIs

Use this route only when the request needs an existing manifest, database, remote object store, custom `DeckSource`, or a router pipeline that the generated `createDecks(config)` kit cannot express.

For normal file-based decks, stay with `hono-decks init`, generated modules, and `createDecks(config)`.

## Custom DeckSource

A source lists deck summaries, returns compiled decks, and optionally serves assets:

```ts
import type {
  CompiledDeck,
  DeckEntry,
  DeckSource,
} from "hono-decks";

export function databaseDeckSource(input: {
  list(): Promise<DeckEntry[]>;
  find(slug: string): Promise<CompiledDeck | null>;
}): DeckSource {
  return {
    async listDecks() {
      return input.list();
    },
    async getCompiledDeck(_c, slug) {
      return input.find(slug);
    },
  };
}
```

Compiled data must satisfy the public `CompiledDeck` model. Do not send raw MDX to the Worker and invoke the Node compiler per request.

## Decorate generated data

If only asset lookup, visibility, metadata, or caching changes, prefer `config.source(source)` over replacing the entire generated flow:

```ts
import { defineDecksConfig, type DeckSource } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  source(source: DeckSource): DeckSource {
    return {
      async listDecks(c) {
        return (await source.listDecks(c)).filter((deck) => !deck.draft);
      },
      getCompiledDeck: (c, slug) => source.getCompiledDeck(c, slug),
      getAsset: (c, slug, assetPath) => source.getAsset?.(c, slug, assetPath) ?? Promise.resolve(null),
    };
  },
});
```

## Assemble a low-level router

```ts
import { Hono } from "hono";
import {
  decksRouter,
  manifestDeckSource,
  type DeckManifest,
} from "hono-decks/advanced";

export function createInternalSlides(manifest: DeckManifest) {
  const app = new Hono();
  const source = manifestDeckSource(manifest);

  app.route(
    "/internal-slides",
    decksRouter({
      source,
      dev: false,
      presenter: false,
      embed: false,
      export: false,
    }),
  );

  return app;
}
```

At this level the application owns the mount path, option merging, source policy, draft behavior, and security. Use `createDeckPaths(mountPath, slug)` whenever low-level code needs a route map.

## Boundary checks

- compile or validate raw MDX before deployment, outside the Worker
- return 404 for missing or unauthorized decks without leaking their existence
- keep asset paths normalized and prevent traversal into unrelated objects
- keep `listDecks` and `getCompiledDeck` visibility policies consistent
- preserve JSON-serializable client-island props in custom compiled data
- explicitly configure presenter, embed CSP, and export authorization when enabling those surfaces
- add contract tests for every custom source method and route surface
