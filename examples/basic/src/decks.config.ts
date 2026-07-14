import {
  defineDecksConfig,
  withR2Assets,
  type DeckBrowserRunBinding,
  type DeckSource,
  type R2BucketLike,
} from "hono-decks";
import { renderSampleViewerHead } from "./pages";

export interface DecksConfigBindings {
  DECK_ASSETS?: R2BucketLike;
  BROWSER?: DeckBrowserRunBinding;
  DECK_EMBED_ALLOWED_ORIGINS?: string;
  DECK_EXPORT_TOKEN?: string;
  DECK_PRESENTER_ENABLED?: boolean | string;
  DECK_RUNTIME_DEV?: boolean | string;
}

export interface DecksConfigEnv {
  Bindings: DecksConfigBindings;
}

const R2_CACHE_CONTROL = "public, max-age=31536000, immutable";

function truthyBinding(value: unknown): boolean {
  return value === true || value === "true";
}

const decksConfig = defineDecksConfig<DecksConfigEnv>({
  mountPath: "/decks",

  source(source: DeckSource<DecksConfigEnv>): DeckSource<DecksConfigEnv> {
    const r2BackedSource = withR2Assets(source, {
      bucket: (c) => c.env?.DECK_ASSETS,
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
    dev: (c) => {
      const value = c.env?.DECK_RUNTIME_DEV;
      return truthyBinding(value);
    },
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
        controls: {
          items: (controls) => [
            controls.previous,
            controls.position,
            controls.next,
            controls.fullscreen,
          ],
        },
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
            href: `${context.meta.canonicalPath}/about`,
            label: "Details",
            icon: "details",
            attributes: { "data-sample-control": "details" },
          },
        ],
      },
    },
    export: {
      authorize: (c) => {
        const token = c.env?.DECK_EXPORT_TOKEN;
        if (typeof token !== "string" || token.length === 0) return false;

        const authorization = c.req.header("authorization");
        if (!authorization) return false;

        const match = authorization.match(/^Bearer\s+(.+)$/i);
        return match?.[1]?.trim() === token;
      },
      browser: (c) => c.env?.BROWSER,
      pdf: true,
      png: true,
    },
  },
});

export default decksConfig;
