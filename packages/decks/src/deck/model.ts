import type { Context } from "hono";
import type { DeckRenderable, MaybePromise, SlideComponentInput } from "../renderer/compiled-render";
import type { SlideNode } from "../shared/types";

export type DeckKind = "directory" | "single-file";

export const SLIDE_TRANSITIONS = [
  "none",
  "fade",
  "fade-out",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "view-transition",
] as const;

export type SlideTransition = (typeof SLIDE_TRANSITIONS)[number];
export type SlideFragmentsMode = "none" | "manual" | "list";

export interface DeckFrontmatter {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  date?: string;
  theme?: string;
  transition?: SlideTransition;
  transitionDuration?: string;
  transitionEasing?: string;
  draft?: boolean;
  assets?: string | string[];
  presenter?: boolean;
  meta: Record<string, unknown>;
}

export interface SlideFrontmatter {
  title?: string;
  layout?: string;
  className?: string;
  notes?: string;
  background?: string;
  transition?: SlideTransition;
  transitionDuration?: string;
  transitionEasing?: string;
  fragments?: SlideFragmentsMode;
  meta: Record<string, unknown>;
}

export interface ComponentPlaceholder {
  id: string;
  name: string;
  props: Record<string, unknown>;
  source: string;
}

export interface AssetRef {
  sourcePath: string;
  publicPath: string;
  type: "local" | "remote" | "r2" | "public";
  contentType?: string;
  cacheControl?: string | false;
  r2Key?: string;
  body?: BodyInit;
}

export interface CompileWarning {
  code: string;
  message: string;
  slideIndex?: number;
}

export interface CompiledSlide {
  index: number;
  meta: SlideFrontmatter;
  html: string;
  nodes?: SlideNode[];
  render?: (props?: { components?: Record<string, unknown> }) => MaybePromise<DeckRenderable>;
  components: ComponentPlaceholder[];
  notes?: string;
}

export interface CompiledDeck {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  meta: DeckFrontmatter;
  themeStyle?: string;
  themeSourcePath?: string;
  slides: CompiledSlide[];
  assets: AssetRef[];
  componentRegistry?: Record<string, SlideComponentInput>;
  warnings: CompileWarning[];
}

export interface DeckEntry {
  slug: string;
  title?: string;
  description?: string;
  draft?: boolean;
  sourcePath: string;
}

export interface DeckFileEntry {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
}

export interface DeckFileChange {
  type: "created" | "changed" | "deleted";
  path: string;
  slug?: string;
}

export interface LocalDeckIO {
  listFiles(): Promise<DeckFileEntry[]>;
  readMarkdown(slug: string): Promise<string | null>;
  readAsset?(path: string): Promise<BodyInit | Uint8Array | null>;
  watch?(onFileChange: (event: DeckFileChange) => void): () => void;
}

export interface DeckSource {
  listDecks(c: Context): Promise<DeckEntry[]>;
  getCompiledDeck(c: Context, slug: string): Promise<CompiledDeck | null>;
  getAsset?(c: Context, slug: string, assetPath: string): Promise<Response | null>;
}

export interface DeckManifest {
  decks: CompiledDeck[];
}

export interface CompileDeckInput {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  markdown: string;
}

export interface DeckCompiler {
  compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck>;
}

export class CompileError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CompileError";
  }
}

export class RenderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RenderError";
  }
}
