import type { Context, Env } from "hono";
import type { AssetRef, CompiledDeck, DeckSource } from "../deck/model";

export interface R2ObjectHttpMetadataLike {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
}

export interface R2ObjectBodyLike {
  body?: BodyInit | null;
  httpMetadata?: R2ObjectHttpMetadataLike;
  arrayBuffer?(): Promise<ArrayBuffer>;
  writeHttpMetadata?(headers: Headers): void;
}

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
}

export type R2BucketResolver<E extends Env = any> =
  | R2BucketLike
  | (<RequestEnv extends E>(c: Context<RequestEnv>) => R2BucketLike | undefined | Promise<R2BucketLike | undefined>);

export interface R2AssetKeyInput {
  deck: CompiledDeck;
  asset: AssetRef;
  slug: string;
  assetPath: string;
}

export interface R2AssetSourceOptions<E extends Env = any> {
  bucket: R2BucketResolver<E>;
  keyPrefix?: string;
  key?(input: R2AssetKeyInput): string;
  cacheControl?: string | false | ((input: R2AssetKeyInput) => string | false | undefined);
}

export function withR2Assets<E extends Env = any>(source: DeckSource<E>, options: R2AssetSourceOptions<E>): DeckSource<E> {
  return {
    async listDecks(c) {
      return source.listDecks(c);
    },

    async getCompiledDeck(c, slug) {
      return source.getCompiledDeck(c, slug);
    },

    async getAsset(c, slug, assetPath) {
      const deck = await source.getCompiledDeck(c, slug);
      const asset = deck ? findRoutableAsset(deck.assets, slug, assetPath) : undefined;
      const bucket = asset ? await resolveBucket(options.bucket, c) : undefined;
      if (deck && asset && bucket) {
        const object = await bucket.get(resolveR2Key({ deck, asset, slug, assetPath }, options));
        if (object) {
          const response = await responseFromR2Object(object, { deck, asset, slug, assetPath }, options);
          if (response) return response;
        }
      }

      return source.getAsset?.(c, slug, assetPath) ?? null;
    },
  };
}

async function resolveBucket<E extends Env, RequestEnv extends E>(
  bucket: R2BucketResolver<E>,
  c: Context<RequestEnv>,
): Promise<R2BucketLike | undefined> {
  return typeof bucket === "function" ? bucket(c) : bucket;
}

function findRoutableAsset(assets: AssetRef[], slug: string, assetPath: string): AssetRef | undefined {
  const normalized = stripLeadingSlashes(assetPath);
  return assets.find((asset) => {
    if (asset.type !== "local" && asset.type !== "r2") return false;
    const suffix = `/${slug}/assets/${normalized}`;
    return asset.publicPath.endsWith(suffix);
  });
}

function resolveR2Key<E extends Env>(input: R2AssetKeyInput, options: R2AssetSourceOptions<E>): string {
  if (options.key) return options.key(input);
  if (input.asset.r2Key) return input.asset.r2Key;
  const key = input.asset.sourcePath || `${input.slug}/assets/${input.assetPath}`;
  const prefix = options.keyPrefix ? stripTrailingSlashes(options.keyPrefix) : undefined;
  const normalizedKey = stripLeadingSlashes(key);
  return prefix ? `${prefix}/${normalizedKey}` : normalizedKey;
}

function stripLeadingSlashes(value: string): string {
  let index = 0;
  while (value[index] === "/") index += 1;
  return value.slice(index);
}

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end -= 1;
  return value.slice(0, end);
}

async function responseFromR2Object<E extends Env>(
  object: R2ObjectBodyLike,
  input: R2AssetKeyInput,
  options: R2AssetSourceOptions<E>,
): Promise<Response | null> {
  const body = object.body ?? (object.arrayBuffer ? await object.arrayBuffer() : undefined);
  if (body == null) return null;

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  applyHttpMetadata(headers, object.httpMetadata);
  if (!headers.has("content-type") && input.asset.contentType) headers.set("content-type", input.asset.contentType);

  const cacheControl = resolveCacheControl(input, options);
  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  } else if (cacheControl !== false && input.asset.cacheControl && !headers.has("cache-control")) {
    headers.set("cache-control", input.asset.cacheControl);
  }

  return new Response(body, { headers });
}

function applyHttpMetadata(headers: Headers, metadata: R2ObjectHttpMetadataLike | undefined): void {
  if (!metadata) return;
  if (metadata.contentType && !headers.has("content-type")) headers.set("content-type", metadata.contentType);
  if (metadata.cacheControl && !headers.has("cache-control")) headers.set("cache-control", metadata.cacheControl);
  if (metadata.contentDisposition && !headers.has("content-disposition")) {
    headers.set("content-disposition", metadata.contentDisposition);
  }
  if (metadata.contentEncoding && !headers.has("content-encoding")) headers.set("content-encoding", metadata.contentEncoding);
  if (metadata.contentLanguage && !headers.has("content-language")) headers.set("content-language", metadata.contentLanguage);
}

function resolveCacheControl(
  input: R2AssetKeyInput,
  options: Pick<R2AssetSourceOptions, "cacheControl">,
): string | false | undefined {
  return typeof options.cacheControl === "function" ? options.cacheControl(input) : options.cacheControl;
}
