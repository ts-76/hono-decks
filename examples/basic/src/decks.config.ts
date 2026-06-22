import {
  defineDecksConfig,
  withR2Assets,
  type DeckBrowserRunBinding,
  type DeckSource,
  type R2BucketLike,
} from "@hono/decks";

export interface DecksConfigBindings {
  DECK_ASSETS?: R2BucketLike;
  BROWSER?: DeckBrowserRunBinding;
  DECK_EXPORT_TOKEN?: string;
}

const R2_CACHE_CONTROL = "public, max-age=31536000, immutable";

const decksConfig = defineDecksConfig({
  mountPath: "/decks",

  source(source: DeckSource): DeckSource {
    const r2BackedSource = withR2Assets(source, {
      bucket: (c) => (c.env as DecksConfigBindings | undefined)?.DECK_ASSETS,
      cacheControl: R2_CACHE_CONTROL,
    });

    return {
      listDecks(c) {
        return r2BackedSource.listDecks(c);
      },

      getCompiledDeck(c, slug) {
        return r2BackedSource.getCompiledDeck(c, slug);
      },

      async getAsset(c, slug, assetPath) {
        const response = await r2BackedSource.getAsset?.(c, slug, assetPath);
        if (!response) return null;

        const headers = new Headers(response.headers);
        headers.set(
          "x-hono-decks-asset-source",
          headers.get("cache-control") === R2_CACHE_CONTROL ? "r2" : "embedded",
        );

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      },
    };
  },

  router: {
    export: {
      authorize: (c) => {
        const token = (c.env as DecksConfigBindings).DECK_EXPORT_TOKEN;
        return typeof token === "string" && token.length > 0 && c.req.header("authorization") === `Bearer ${token}`;
      },
      browser: (c) => (c.env as DecksConfigBindings).BROWSER,
      pdf: true,
      png: true,
    },
  },
});

export default decksConfig;
