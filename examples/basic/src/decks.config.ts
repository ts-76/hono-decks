import {
  defineDecksConfig,
  withR2Assets,
  type DeckBrowserRunBinding,
  type DeckSource,
  type R2BucketLike,
} from "@hono/decks";
import { renderSampleViewerHead } from "./pages";

export interface DecksConfigBindings {
  DECK_ASSETS?: R2BucketLike;
  BROWSER?: DeckBrowserRunBinding;
  DECK_EXPORT_TOKEN?: string;
  DECK_PRESENTER_ENABLED?: boolean | string;
  DECK_RUNTIME_DEV?: boolean | string;
}

const R2_CACHE_CONTROL = "public, max-age=31536000, immutable";

function truthyBinding(value: unknown): boolean {
  return value === true || value === "true";
}

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
    dev: (c) => {
      const value = (c.env as DecksConfigBindings | undefined)?.DECK_RUNTIME_DEV;
      return truthyBinding(value);
    },
    presenter: {
      enabled: ({ c, dev }) => dev || truthyBinding((c.env as DecksConfigBindings | undefined)?.DECK_PRESENTER_ENABLED),
      viewerControl: {
        label: "Presenter",
        icon: "presenter",
        attributes: { "data-sample-control": "presenter" },
      },
    },
    viewer: {
      head: renderSampleViewerHead(),
      controls: {
        className: "sample-viewer-controls",
        itemClassName: "sample-viewer-control",
        hidden: ["fullscreen"],
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
        const token = (c.env as DecksConfigBindings | undefined)?.DECK_EXPORT_TOKEN;
        if (typeof token !== "string" || token.length === 0) return false;

        const authorization = c.req.header("authorization");
        if (!authorization) return false;

        const match = authorization.match(/^Bearer\s+(.+)$/i);
        return match?.[1]?.trim() === token;
      },
      browser: (c) => (c.env as DecksConfigBindings).BROWSER,
      pdf: true,
      png: true,
    },
  },
});

export default decksConfig;
