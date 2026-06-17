import type {
  AssetRef,
  CompiledDeck,
  CompileDeckInput,
  DeckCompiler,
  DeckEntry,
  DeckFileChange,
  DeckFileEntry,
  DeckSource,
  LocalDeckIO,
} from "../deck/model";
import type { PreviewEventHub } from "./preview-events";

export interface DevDeckRuntimeInput {
  initialDecks: CompiledDeck[];
  localDeckIO: LocalDeckIO;
  compiler: DeckCompiler;
  previewEvents?: PreviewEventHub;
  mountPath?: string;
}

export interface DevDeckRuntime {
  source: DeckSource;
  handleFileChange(event: DeckFileChange): Promise<void>;
  start(): () => void;
}

export function createDevDeckRuntime(input: DevDeckRuntimeInput): DevDeckRuntime {
  const decks = new Map(input.initialDecks.map((deck) => [deck.slug, deck]));
  const sourceChangeVersions = new Map<string, number>();

  const source: DeckSource = {
    async listDecks(): Promise<DeckEntry[]> {
      return [...decks.values()].map((deck) => ({
        slug: deck.slug,
        title: deck.meta.title,
        description: deck.meta.description,
        draft: deck.meta.draft,
        sourcePath: deck.sourcePath,
      }));
    },

    async getCompiledDeck(_c, slug) {
      return decks.get(slug) ?? null;
    },

    async getAsset(_c, slug, assetPath) {
      const deck = decks.get(slug);
      if (!deck) return null;

      const asset = findLocalAsset(deck.assets, slug, assetPath);
      if (!asset || asset.body == null) return null;

      return new Response(asset.body, {
        headers: asset.contentType ? { "content-type": asset.contentType } : undefined,
      });
    },
  };

  const runtime: DevDeckRuntime = {
    source,

    async handleFileChange(event) {
      if (!event.slug) return;

      const current = decks.get(event.slug);

      if (current && isDeckSourceDelete(event, current)) {
        nextSourceChangeVersion(sourceChangeVersions, event.slug);
        decks.delete(event.slug);
        publishUpdate(input.previewEvents, event, { deleted: true });
        return;
      }

      if (current && isAssetPath(event.path)) {
        const next = await applyAssetChange(input.localDeckIO, current, event, input.mountPath);
        if (next) decks.set(event.slug, next);
        publishUpdate(input.previewEvents, event);
        return;
      }

      const version = nextSourceChangeVersion(sourceChangeVersions, event.slug);
      try {
        const markdown = await input.localDeckIO.readMarkdown(event.slug);
        if (markdown == null) return;
        const fileEntry = current ? undefined : await findDeckFileEntry(input.localDeckIO, event.slug);

        const compiled = await input.compiler.compileMarkdown({
          slug: event.slug,
          sourcePath: current?.sourcePath ?? fileEntry?.sourcePath ?? event.path,
          kind: current?.kind ?? fileEntry?.kind ?? "directory",
          markdown,
        } satisfies CompileDeckInput);
        if (version !== sourceChangeVersions.get(event.slug)) return;
        const latest = decks.get(event.slug);
        decks.set(event.slug, {
          ...compiled,
          assets: mergeCompiledAndLocalAssets(compiled.assets, latest?.assets ?? current?.assets ?? []),
        });
        publishUpdate(input.previewEvents, event);
      } catch (error) {
        if (version !== sourceChangeVersions.get(event.slug)) return;
        input.previewEvents?.publish({
          type: "deck:error",
          slug: event.slug,
          data: { message: error instanceof Error ? error.message : String(error), path: event.path },
        });
      }
    },

    start() {
      return input.localDeckIO.watch?.((event) => {
        void runtime.handleFileChange(event);
      }) ?? (() => {});
    },
  };

  return runtime;
}

function nextSourceChangeVersion(versions: Map<string, number>, slug: string): number {
  const next = (versions.get(slug) ?? 0) + 1;
  versions.set(slug, next);
  return next;
}

async function findDeckFileEntry(localDeckIO: LocalDeckIO, slug: string): Promise<DeckFileEntry | undefined> {
  return (await localDeckIO.listFiles()).find((entry) => entry.slug === slug);
}

async function applyAssetChange(
  localDeckIO: LocalDeckIO,
  deck: CompiledDeck,
  event: DeckFileChange,
  mountPath?: string,
): Promise<CompiledDeck | undefined> {
  const asset = deck.assets.find((candidate) => candidate.sourcePath === event.path);
  if (!asset) return addNewLocalAsset(localDeckIO, deck, event, mountPath);

  if (event.type === "deleted") {
    return {
      ...deck,
      assets: deck.assets.filter((candidate) => candidate.sourcePath !== event.path),
    };
  }

  if (!localDeckIO.readAsset) return deck;
  const body = await localDeckIO.readAsset(event.path);
  if (body == null) return deck;

  return {
    ...deck,
    assets: deck.assets.map((candidate) =>
      candidate.sourcePath === event.path ? { ...candidate, body: body as BodyInit } : candidate,
    ),
  };
}

async function addNewLocalAsset(
  localDeckIO: LocalDeckIO,
  deck: CompiledDeck,
  event: DeckFileChange,
  mountPath?: string,
): Promise<CompiledDeck> {
  if (event.type === "deleted" || !event.slug || !localDeckIO.readAsset) return deck;

  const body = await localDeckIO.readAsset(event.path);
  if (body == null) return deck;

  return {
    ...deck,
    assets: [
      ...deck.assets,
      {
        sourcePath: event.path,
        publicPath: publicPathForLocalAsset(event.slug, event.path, mountPath),
        type: "local",
        contentType: contentTypeForPath(event.path),
        body: body as BodyInit,
      },
    ],
  };
}

function isDeckSourceDelete(event: DeckFileChange, deck: CompiledDeck): boolean {
  return event.type === "deleted" && event.path === deck.sourcePath;
}

function mergeCompiledAndLocalAssets(compiledAssets: AssetRef[], currentAssets: AssetRef[]): AssetRef[] {
  const merged = new Map<string, AssetRef>();
  for (const asset of currentAssets) {
    if (asset.type === "local") merged.set(asset.sourcePath, asset);
  }
  for (const asset of compiledAssets) {
    if (!merged.has(asset.sourcePath)) merged.set(asset.sourcePath, asset);
  }
  return [...merged.values()];
}

function isAssetPath(path: string): boolean {
  return path.includes("/assets/");
}

function publicPathForLocalAsset(slug: string, sourcePath: string, mountPath = "/decks"): string {
  const marker = `/${slug}/assets/`;
  const normalized = sourcePath.replaceAll("\\", "/");
  const markerIndex = normalized.indexOf(marker);
  const assetPath = markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
  return `${normalizeMountPath(mountPath)}/${encodeURIComponent(slug)}/assets/${assetPath.split("/").map(encodeURIComponent).join("/")}`;
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function contentTypeForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}

function publishUpdate(
  previewEvents: PreviewEventHub | undefined,
  event: DeckFileChange,
  data: Record<string, unknown> = {},
): void {
  if (!event.slug) return;
  previewEvents?.publish({
    type: "deck:updated",
    slug: event.slug,
    data: { source: "watch", path: event.path, ...data },
  });
}

function findLocalAsset(assets: AssetRef[], slug: string, assetPath: string): AssetRef | undefined {
  const normalized = assetPath.replace(/^\/+/, "");
  return assets.find((asset) => {
    if (asset.type !== "local") return false;
    const suffix = `/${slug}/assets/${normalized}`;
    return asset.publicPath.endsWith(suffix);
  });
}
