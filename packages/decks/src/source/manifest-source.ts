import type { Env } from "hono";
import type { AssetRef, CompiledDeck, DeckEntry, DeckManifest, DeckSource } from "../deck/model";

export function manifestDeckSource<E extends Env = any>(manifest: DeckManifest): DeckSource<E> {
  const etags = new WeakMap<AssetRef, Promise<string | undefined>>();
  const decks = new Map(manifest.decks.map((deck) => [deck.slug, deck]));

  return {
    async listDecks(): Promise<DeckEntry[]> {
      return manifest.decks.map((deck) => ({
        slug: deck.slug,
        title: deck.meta.title,
        description: deck.meta.description,
        draft: deck.meta.draft,
        sourcePath: deck.sourcePath,
      }));
    },

    async getCompiledDeck(_c, slug: string): Promise<CompiledDeck | null> {
      return decks.get(slug) ?? null;
    },

    async getAsset(_c, slug: string, assetPath: string): Promise<Response | null> {
      const deck = decks.get(slug);
      if (!deck) return null;

      const asset = findLocalAsset(deck.assets, slug, assetPath);
      if (!asset || asset.body == null) return null;

      const headers = new Headers(localAssetHeaders(asset));
      if (asset.cacheControl !== false) {
        let tag = etags.get(asset);
        if (!tag) {
          tag = assetEtag(asset.body);
          etags.set(asset, tag);
        }
        const etag = await tag;
        if (etag) headers.set("etag", etag);
      }
      return new Response(asset.body, { headers });
    },
  };
}

function localAssetHeaders(asset: AssetRef): HeadersInit {
  const headers: Record<string, string> = {};
  if (asset.contentType) headers["content-type"] = asset.contentType;
  if (asset.cacheControl !== false)
    headers["cache-control"] = asset.cacheControl ?? "public, max-age=0, must-revalidate";
  return headers;
}

function findLocalAsset(assets: AssetRef[], slug: string, assetPath: string): AssetRef | undefined {
  const normalized = assetPath.replace(/^\/+/, "");
  return assets.find((asset) => {
    if (asset.type !== "local") return false;
    const suffix = `/${slug}/assets/${normalized}`;
    return asset.publicPath.endsWith(suffix);
  });
}

/** Only hash reusable bodies; consuming an application-owned stream would break delivery. */
async function assetEtag(body: BodyInit): Promise<string | undefined> {
  let bytes: ArrayBuffer;
  if (typeof body === "string") bytes = new TextEncoder().encode(body).buffer;
  else if (body instanceof ArrayBuffer) bytes = body;
  else if (ArrayBuffer.isView(body))
    bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength).slice().buffer;
  else if (body instanceof Blob) bytes = await body.arrayBuffer();
  else return undefined;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return '"' + Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("") + '"';
}
