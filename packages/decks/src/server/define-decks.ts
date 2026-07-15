import type { Env, Hono, MiddlewareHandler } from "hono";
import type { CompiledDeck, DeckManifest, DeckSource } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import { manifestDeckSource } from "../source/manifest-source";
import { deckContext, decksRouter } from "./router";
import type { DeckContextVariables, DecksRouterOptions } from "./router";
import { createDeckPaths, normalizeMountPath, type DeckPaths } from "./paths";
import type { DeckViewerControlSlotItems } from "./viewer";

export type DecksOptions<E extends Env = any> = Omit<DecksRouterOptions<E>, "source"> &
  (
    | {
        manifest: DeckManifest;
        decks?: never;
      }
    | {
        decks: CompiledDeck[];
        manifest?: never;
      }
  );

/** Per-mount overrides merged on top of generated defaults and app config. */
export type DecksRouterOverrides<E extends Env = any> = Partial<Omit<DecksRouterOptions<E>, "components" | "clientEntryAsset">> & {
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
};

/** Runtime options that keep the configured kit on its single transformed source. */
export type DecksRouterConfig<E extends Env = any> = Omit<DecksRouterOverrides<E>, "source">;

export interface DefinedDecks<E extends Env = any> {
  source: DeckSource<E>;
  router(overrides?: DecksRouterOverrides<E>): Hono<E>;
}

/** File-system settings consumed by the CLI. */
export interface DecksBuildConfig {
  /** Deck source directory. @default "decks" */
  root?: string;
  /** Generated module directory. @default "src/generated" */
  outDir?: string;
  /** Optional deterministic Open Graph metadata cache. */
  ogpCacheFile?: string;
}

/** Shared configuration consumed by both the CLI and the generated runtime kit. */
export interface DecksConfig<E extends Env = any> {
  /** Public route where the configured router is mounted. */
  mountPath: string;
  build?: DecksBuildConfig;
  source?(source: DeckSource<E>): DeckSource<E>;
  router?: DecksRouterConfig<E>;
}

/** A generated deck collection configured for one application. */
export interface ConfiguredDecks<E extends Env = any> {
  mountPath: string;
  source: DeckSource<E>;
  router(overrides?: DecksRouterConfig<E>): Hono<E>;
  context(
    overrides?: Pick<DecksRouterOptions<E>, "dev" | "viewer">,
  ): MiddlewareHandler<E & { Variables: DeckContextVariables }>;
  paths(slug: string): DeckPaths;
}

export function defineDecks<E extends Env = any>(options: DecksOptions<E>): DefinedDecks<E> {
  const manifest = Array.isArray(options.decks) ? { decks: options.decks } : options.manifest;
  if (!manifest) throw new Error("defineDecks requires either decks or manifest.");
  const source = manifestDeckSource<E>(manifest);
  const baseOptions: DecksRouterOptions<E> = {
    ...options,
    source,
  };

  return {
    source,
    router(overrides = {}) {
      const nextSource = overrides.source ?? source;
      return decksRouter<E>(mergeDecksRouterOptions(baseOptions, { ...overrides, source: nextSource }));
    },
  };
}

/** Defines the single configuration consumed by the CLI and runtime. */
export function defineDecksConfig<E extends Env = any>(config: DecksConfig<E>): DecksConfig<E> {
  return config;
}

/** Applies app configuration to generated decks and returns the primary runtime API. */
export function configureDecks<E extends Env = any>(
  defined: DefinedDecks<E>,
  config: DecksConfig<E>,
): ConfiguredDecks<E> {
  const mountPath = normalizeMountPath(config.mountPath);
  const source = config.source?.(defined.source) ?? defined.source;
  const configuredRouter = mergeDecksRouterOptions(
    { source, ...config.router },
    { source },
  );

  return {
    mountPath,
    source,
    router(overrides = {}) {
      return defined.router(mergeDecksRouterOptions(configuredRouter, overrides));
    },
    context(overrides = {}) {
      const merged = mergeDecksRouterOptions(configuredRouter, overrides);
      return deckContext({
        source,
        mountPath,
        dev: merged.dev,
        viewer: merged.viewer,
      });
    },
    paths(slug) {
      return createDeckPaths(mountPath, slug);
    },
  };
}

export function mergeDecksRouterOptions<E extends Env = any>(
  base: DecksRouterOptions<E>,
  overrides: DecksRouterOverrides<E>,
): DecksRouterOptions<E> {
  const viewer = mergeViewerOptions(base.viewer, overrides.viewer);
  const presenter = mergePresenterOptions(base.presenter, overrides.presenter);
  const document = mergeDocumentOptions(base.document, overrides.document);
  const pages = mergePagesOptions(base.pages, overrides.pages);
  const embed = mergeExternalEmbedOptions(base.embed, overrides.embed);
  const exportOptions = overrides.export === false
    ? false
    : base.export === false
      ? overrides.export
      : base.export || overrides.export
        ? { ...base.export, ...overrides.export }
        : undefined;
  const components = base.components || overrides.components ? { ...base.components, ...overrides.components } : undefined;
  return {
    ...base,
    ...overrides,
    ...(viewer === undefined ? {} : { viewer }),
    ...(presenter === undefined ? {} : { presenter }),
    ...(document === undefined ? {} : { document }),
    ...(pages === undefined ? {} : { pages }),
    ...(embed === undefined ? {} : { embed }),
    ...(exportOptions === undefined ? {} : { export: exportOptions as DecksRouterOptions<E>["export"] }),
    ...(components === undefined ? {} : { components }),
    source: overrides.source ?? base.source,
  };
}

function mergePagesOptions<E extends Env>(
  base: DecksRouterOptions<E>["pages"],
  override: DecksRouterOverrides<E>["pages"],
): DecksRouterOptions<E>["pages"] {
  if (!base) return override;
  if (!override) return base;
  const index =
    override.index === false
      ? false
      : override.index === undefined
        ? base.index
        : base.index === false || base.index === undefined
          ? override.index
          : { ...base.index, ...override.index };
  return {
    ...base,
    ...override,
    ...(index === undefined ? {} : { index }),
  };
}

function mergeExternalEmbedOptions<E extends Env>(
  base: DecksRouterOptions<E>["embed"],
  override: DecksRouterOverrides<E>["embed"],
): DecksRouterOptions<E>["embed"] {
  if (override === false) return false;
  if (override === undefined) return base;
  if (base === false || base === undefined) return override;
  const viewer =
    typeof base.viewer === "object" && typeof override.viewer === "object"
      ? { ...base.viewer, ...override.viewer }
      : (override.viewer ?? base.viewer);
  const document =
    base.document || override.document ? { ...base.document, ...override.document } : undefined;
  return {
    ...base,
    ...override,
    ...(viewer === undefined ? {} : { viewer }),
    ...(document === undefined ? {} : { document }),
  };
}

function mergeDocumentOptions<E extends Env>(
  base: DecksRouterOptions<E>["document"],
  override: DecksRouterOverrides<E>["document"],
): DecksRouterOptions<E>["document"] {
  if (!base) return override;
  if (!override) return base;
  return {
    ...base,
    ...override,
    surfaces: base.surfaces || override.surfaces ? { ...base.surfaces, ...override.surfaces } : undefined,
  };
}

function mergeViewerOptions<E extends Env>(
  base: DecksRouterOptions<E>["viewer"],
  override: DecksRouterOverrides<E>["viewer"],
): DecksRouterOptions<E>["viewer"] {
  if (!base) return override;
  if (!override) return base;
  const controls = mergeControls(base.controls, override.controls);
  const openGraph = mergeOpenGraph(base.openGraph, override.openGraph);
  return {
    ...base,
    ...override,
    ...(controls === undefined ? {} : { controls }),
    ...(openGraph === undefined ? {} : { openGraph }),
  };
}

function mergeOpenGraph(
  base: NonNullable<DecksRouterOptions["viewer"]>["openGraph"],
  override: NonNullable<DecksRouterOptions["viewer"]>["openGraph"],
): NonNullable<DecksRouterOptions["viewer"]>["openGraph"] {
  if (override === undefined) return base;
  if (base === undefined || typeof base === "boolean" || typeof override === "boolean") return override;
  return { ...base, ...override };
}

function mergeControls(
  base: NonNullable<DecksRouterOptions["viewer"]>["controls"],
  override: NonNullable<DecksRouterOptions["viewer"]>["controls"],
): NonNullable<DecksRouterOptions["viewer"]>["controls"] {
  if (override === undefined) return base;
  if (base === undefined || base === false || override === false) return override;
  return {
    ...base,
    ...override,
    attributes:
      base.attributes || override.attributes ? { ...base.attributes, ...override.attributes } : undefined,
    labels: base.labels || override.labels ? { ...base.labels, ...override.labels } : undefined,
    hidden: base.hidden || override.hidden ? [...new Set([...(base.hidden ?? []), ...(override.hidden ?? [])])] : undefined,
    before: mergeControlSlots(base.before, override.before),
    after: mergeControlSlots(base.after, override.after),
  };
}

function mergeControlSlots(
  base: DeckViewerControlSlotItems | undefined,
  override: DeckViewerControlSlotItems | undefined,
): DeckViewerControlSlotItems | undefined {
  if (override === undefined) return base;
  if (base === undefined) return override;
  if (Array.isArray(base) && Array.isArray(override)) return [...base, ...override];
  return override;
}

function mergePresenterOptions<E extends Env>(
  base: DecksRouterOptions<E>["presenter"],
  override: DecksRouterOverrides<E>["presenter"],
): DecksRouterOptions<E>["presenter"] {
  if (override === undefined) return base;
  if (override === false || base === false || base === undefined) return override;
  const viewerControl =
    typeof base.viewerControl === "object" && typeof override.viewerControl === "object"
      ? { ...base.viewerControl, ...override.viewerControl }
      : (override.viewerControl ?? base.viewerControl);
  return { ...base, ...override, viewerControl };
}
