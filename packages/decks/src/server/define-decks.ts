import type { Env, Hono } from "hono";
import type { CompiledDeck, DeckManifest, DeckSource } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import { manifestDeckSource } from "../source/manifest-source";
import { decksRouter } from "./router";
import type { DecksRouterOptions } from "./router";

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

export type DecksRouterOverrides<E extends Env = any> = Partial<Omit<DecksRouterOptions<E>, "components" | "clientEntryAsset">> & {
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
};

export interface DefinedDecks<E extends Env = any> {
  source: DeckSource<E>;
  router(overrides?: DecksRouterOverrides<E>): Hono<E>;
}

export interface DecksConfig<E extends Env = any> {
  mountPath?: string;
  source?(source: DeckSource<E>): DeckSource<E>;
  router?: DecksRouterOverrides<E>;
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

export function defineDecksConfig<E extends Env = any>(config: DecksConfig<E>): DecksConfig<E> {
  return config;
}

export function mergeDecksRouterOptions<E extends Env = any>(
  base: DecksRouterOptions<E>,
  overrides: DecksRouterOverrides<E>,
): DecksRouterOptions<E> {
  const viewer = mergeViewerOptions(base.viewer, overrides.viewer);
  const presenter = mergePresenterOptions(base.presenter, overrides.presenter);
  const document = mergeDocumentOptions(base.document, overrides.document);
  const exportOptions = base.export || overrides.export ? { ...base.export, ...overrides.export } : undefined;
  const components = base.components || overrides.components ? { ...base.components, ...overrides.components } : undefined;
  return {
    ...base,
    ...overrides,
    ...(viewer === undefined ? {} : { viewer }),
    ...(presenter === undefined ? {} : { presenter }),
    ...(document === undefined ? {} : { document }),
    ...(exportOptions === undefined ? {} : { export: exportOptions as DecksRouterOptions<E>["export"] }),
    ...(components === undefined ? {} : { components }),
    source: overrides.source ?? base.source,
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
  return { ...base, ...override, ...(controls === undefined ? {} : { controls }) };
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
  };
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
