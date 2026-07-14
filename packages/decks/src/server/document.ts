import type { Context, Env } from "hono";
import type { CompiledDeck } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";

export type DeckDocumentSurface = "index" | "viewer" | "render" | "print" | "presentation" | "presenter";

export interface DeckDocumentRenderInput<E extends Env = any> {
  c: Context<E>;
  surface: DeckDocumentSurface;
  deck?: CompiledDeck;
  slug?: string;
  mountPath: string;
  title: string;
}

export interface DeckDocumentPageOptions<E extends Env = any> {
  lang?: string | ((input: DeckDocumentRenderInput<E>) => MaybePromise<string | undefined>);
  nonce?: string | ((input: DeckDocumentRenderInput<E>) => MaybePromise<string | undefined>);
  head?: MaybePromise<DeckRenderable> | ((input: DeckDocumentRenderInput<E>) => MaybePromise<DeckRenderable>);
}

export interface DeckDocumentOptions<E extends Env = any> extends DeckDocumentPageOptions<E> {
  surfaces?: Partial<Record<DeckDocumentSurface, DeckDocumentPageOptions<E>>>;
}

export interface ResolvedDeckDocument {
  lang: string;
  nonce?: string;
  head: string;
}

export async function resolveDeckDocument<E extends Env>(
  input: DeckDocumentRenderInput<E>,
  options?: DeckDocumentOptions<E>,
  overrides?: DeckDocumentPageOptions<E>,
): Promise<ResolvedDeckDocument> {
  const page = {
    lang: options?.lang,
    nonce: options?.nonce,
    head: options?.head,
    ...options?.surfaces?.[input.surface],
    ...definedDocumentOptions(overrides),
  };
  const langValue = await resolveDocumentValue(page.lang, input);
  const nonce = await resolveDocumentValue(page.nonce, input);
  const headValue = await resolveDocumentValue(page.head, input);

  return {
    lang: langValue?.trim() || "ja",
    ...(nonce ? { nonce } : {}),
    head: headValue === undefined || headValue === null || headValue === false ? "" : await renderJsxValue(headValue),
  };
}

export function documentNonceAttribute(nonce: string | undefined): string {
  return nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
}

function definedDocumentOptions<E extends Env>(
  options: DeckDocumentPageOptions<E> | undefined,
): DeckDocumentPageOptions<E> {
  if (!options) return {};
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
}

async function resolveDocumentValue<E extends Env, T>(
  value: MaybePromise<T> | ((input: DeckDocumentRenderInput<E>) => MaybePromise<T>) | undefined,
  input: DeckDocumentRenderInput<E>,
): Promise<T | undefined> {
  return typeof value === "function"
    ? await (value as (input: DeckDocumentRenderInput<E>) => MaybePromise<T>)(input)
    : await value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
