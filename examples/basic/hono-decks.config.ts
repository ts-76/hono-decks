import {
  defineDecksConfig,
  withR2Assets,
  type DeckBrowserRunBinding,
  type DeckSource,
  type R2BucketLike,
} from "hono-decks";
import { renderSampleViewerHead } from "./src/pages";

export interface DecksConfigBindings {
  DECK_ASSETS?: R2BucketLike;
  BROWSER?: DeckBrowserRunBinding;
  DECK_EMBED_ALLOWED_ORIGINS?: string;
  DECK_EXPORT_TOKEN?: string;
  DECK_PRESENTER_ENABLED?: boolean | string;
}

export interface DecksConfigEnv {
  Bindings: DecksConfigBindings;
}

const R2_CACHE_CONTROL = "public, max-age=31536000, immutable";

function truthyBinding(value: unknown): boolean {
  return value === true || value === "true";
}

export default defineDecksConfig<DecksConfigEnv>({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
    ogpCacheFile: "decks/ogp-cache.json",
  },
  source(source: DeckSource<DecksConfigEnv>): DeckSource<DecksConfigEnv> {
    const r2BackedSource = withR2Assets(source, {
      bucket: (c) => c.env?.DECK_ASSETS,
      cacheControl: R2_CACHE_CONTROL,
    });
    return {
      listDecks: (c) => r2BackedSource.listDecks(c),
      getCompiledDeck: (c, slug) => r2BackedSource.getCompiledDeck(c, slug),
      async getAsset(c, slug, assetPath) {
        const response = await r2BackedSource.getAsset?.(c, slug, assetPath);
        if (!response) return null;
        const headers = new Headers(response.headers);
        headers.set("x-hono-decks-asset-source", headers.get("cache-control") === R2_CACHE_CONTROL ? "r2" : "embedded");
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      },
    };
  },
  router: {
    presenter: {
      enabled: ({ c, dev }) => dev || truthyBinding(c.env?.DECK_PRESENTER_ENABLED),
      viewerControl: {
        label: "Presenter",
        icon: "presenter",
        attributes: { "data-sample-control": "presenter" },
      },
    },
    embed: {
      frameAncestors: ({ c }) => c.env?.DECK_EMBED_ALLOWED_ORIGINS,
      viewer: {
        className: "sample-external-deck-embed",
      },
    },
    viewer: {
      head: renderSampleViewerHead(),
      controls: {
        className: "sample-viewer-controls",
        itemClassName: "sample-viewer-control",
        before: [
          {
            type: "link",
            href: "/",
            label: "Home",
            icon: "home",
            attributes: { "data-sample-control": "home" },
          },
        ],
        after: (context) => [
          {
            type: "link",
            href: `${context.meta.paths.viewer}/about`,
            label: "Details",
            icon: "details",
            attributes: { "data-sample-control": "details" },
          },
        ],
      },
    },
    export: {
      authorize: ({ c }) => {
        const token = c.env?.DECK_EXPORT_TOKEN;
        const authorization = c.req.header("authorization");
        return (
          typeof token === "string" &&
          token.length > 0 &&
          authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() === token
        );
      },
      browser: ({ c }) => c.env?.BROWSER,
      pdf: true,
      png: true,
    },
  },
});
