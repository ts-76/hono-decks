import type { Env, Hono, MiddlewareHandler } from "hono";
import type { CompiledDeck, DeckManifest, DeckSource } from "../deck/model";
import { manifestDeckSource } from "../source/manifest-source";
import { inheritDeckDefaults } from "./generated";
import { deckContext, decksRouter } from "./router";
import type { DeckContextVariables, DecksRouterOptions } from "./router";
import { createDeckPaths, normalizeMountPath, type DeckPaths } from "./paths";

/** Build settings read by the CLI and the Vite plugin. Never loaded by the Worker. */
export interface DecksBuildConfig {
  /** Build-only Markdown adapter reference. "void" retains the compatible preset. */
  markdown?: "void" | { adapter: string; options?: Record<string, unknown> };
  /** Deck source directory. @default "decks" */
  root?: string;
  /** CLI output directory. Vite keeps modules in memory. @default "src/generated" */
  outDir?: string;
  /** Optional deterministic Open Graph metadata cache. */
  ogpCacheFile?: string;
}

/**
 * Contents of `hono-decks.config.ts`. Only the CLI and the Vite plugin read this
 * file; the compiled module embeds `mountPath`, so the Worker never imports it.
 */
export interface DecksConfig {
  /** Public route where the generated router is mounted. Baked into asset URLs. */
  mountPath: string;
  build?: DecksBuildConfig;
}

/** Router options an application may set. Generated data (mount, bundle) is fixed by the compiler. */
export type DecksRouterConfig<E extends Env = any> = Omit<DecksRouterOptions<E>, "source" | "mountPath" | "liveReloadPath">;

/** Runtime options passed to the generated `createDecks()`. */
export interface DecksOptions<E extends Env = any> extends DecksRouterConfig<E> {
  /** Decorate or replace the generated deck source (R2 assets, filtering, caching). */
  source?(source: DeckSource<E>): DeckSource<E>;
}

/** Compiler output handed to `configureDecks()` by the generated module. */
export interface GeneratedDecks {
  mountPath: string;
  decks?: CompiledDeck[];
  manifest?: DeckManifest;
  /** Generated client island bundle, served at `client.path`. */
  clientBundle?: string;
  /** Development live-reload event stream injected by the Vite plugin. */
  liveReloadPath?: string;
}

/** A compiled deck collection configured for one application. */
export interface ConfiguredDecks<E extends Env = any> {
  mountPath: string;
  source: DeckSource<E>;
  router(overrides?: DecksRouterConfig<E>): Hono<E>;
  context(
    overrides?: Pick<DecksRouterOptions<E>, "dev" | "pages" | "viewer">,
  ): MiddlewareHandler<E & { Variables: DeckContextVariables }>;
  paths(slug: string): DeckPaths;
}

/** Identity helper that types `hono-decks.config.ts`. */
export function defineDecksConfig(config: DecksConfig): DecksConfig {
  return config;
}

/** Applies runtime options to compiled decks and returns the application API. */
export function configureDecks<E extends Env = any>(
  generated: GeneratedDecks,
  options: DecksOptions<E> = {},
): ConfiguredDecks<E> {
  const { source: decorateSource, ...routerOptions } = options;
  const manifest = { decks: (generated.manifest?.decks ?? generated.decks ?? []).map(inheritDeckDefaults) };
  const mountPath = normalizeMountPath(generated.mountPath);
  const baseSource = manifestDeckSource<E>(manifest);
  const source = decorateSource?.(baseSource) ?? baseSource;
  const configured: DecksRouterOptions<E> = mergeDecksRouterOptions<E>(
    {
      source,
      mountPath,
      liveReloadPath: generated.liveReloadPath,
      client: generated.clientBundle === undefined ? undefined : { bundle: generated.clientBundle },
    },
    routerOptions,
  );

  return {
    mountPath,
    source,
    router(overrides = {}) {
      return decksRouter<E>(mergeDecksRouterOptions(configured, overrides));
    },
    context(overrides = {}) {
      const merged = mergeDecksRouterOptions(configured, overrides);
      return deckContext({
        source,
        mountPath,
        dev: merged.dev,
        pages: merged.pages,
        viewer: merged.viewer,
      });
    },
    paths(slug) {
      return createDeckPaths(mountPath, slug);
    },
  };
}

/**
 * Merges router options with one rule: plain objects merge recursively, arrays
 * concatenate (dropping duplicates), and every other value — including `false`
 * and functions — replaces the base. `source` is always replaced and
 * `components` merges by component name.
 */
export function mergeDecksRouterOptions<E extends Env = any>(
  base: DecksRouterOptions<E>,
  overrides: Partial<DecksRouterOptions<E>>,
): DecksRouterOptions<E> {
  const { source, components, ...rest } = overrides;
  const merged = mergeValue(base, rest) as DecksRouterOptions<E>;
  return {
    ...merged,
    source: source ?? base.source,
    ...(base.components || components ? { components: { ...base.components, ...components } } : {}),
  };
}

function mergeValue(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) && Array.isArray(override)) return [...new Set([...base, ...override])];
  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      const next = mergeValue(base[key], value);
      if (next !== undefined) result[key] = next;
    }
    return result;
  }
  return override;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
