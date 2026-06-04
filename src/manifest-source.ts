import type { Context } from "hono";
import type { AssetRef, CompiledDeck, DeckEntry, DeckManifest, DeckSource } from "./deck";

export function manifestDeckSource(manifest: DeckManifest): DeckSource {
  const decks = new Map(manifest.decks.map((deck) => [deck.slug, deck]));

  return {
    async listDecks(_c: Context): Promise<DeckEntry[]> {
      return manifest.decks.map((deck) => ({
        slug: deck.slug,
        title: deck.meta.title,
        description: deck.meta.description,
        draft: deck.meta.draft,
        sourcePath: deck.sourcePath,
      }));
    },

    async getCompiledDeck(_c: Context, slug: string): Promise<CompiledDeck | null> {
      return decks.get(slug) ?? null;
    },

    async getAsset(_c: Context, slug: string, assetPath: string): Promise<Response | null> {
      const deck = decks.get(slug);
      if (!deck) return null;

      const asset = findLocalAsset(deck.assets, slug, assetPath);
      if (!asset || asset.body == null) return null;

      return new Response(asset.body, {
        headers: asset.contentType ? { "content-type": asset.contentType } : undefined,
      });
    },
  };
}

function findLocalAsset(assets: AssetRef[], slug: string, assetPath: string): AssetRef | undefined {
  const normalized = assetPath.replace(/^\/+/, "");
  return assets.find((asset) => {
    if (asset.type !== "local") return false;
    const suffix = `/${slug}/assets/${normalized}`;
    return asset.publicPath.endsWith(suffix);
  });
}
