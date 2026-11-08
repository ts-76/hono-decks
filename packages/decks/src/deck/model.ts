import type { Context, Env } from "hono";
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
  /** Target talk duration in seconds. */
  duration?: number;
  /** Which talk-timer readouts the presenter page and remote show by default. */
  timer?: TalkTimerDisplay;
  meta: Record<string, unknown>;
}

/** Talk-timer readouts that can be hidden. Omitted values default to shown. */
export interface TalkTimerDisplay {
  /** On pace / ahead / behind. */
  pace?: boolean;
  /** Time left until the target. */
  remaining?: boolean;
  /** Time past the target; when hidden, remaining time stops at 00:00. */
  overtime?: boolean;
}

export interface SlideFrontmatter {
  title?: string;
  layout?: string;
  className?: string;
  notes?: string;
  background?: string;
  image?: string;
  imageAlt?: string;
  /** Talk time budgeted for this slide, in seconds. Other main slides share the rest. */
  time?: number;
  /** Marks the first appendix slide; it and every later slide are left out of the pace. */
  appendix?: boolean;
  transition?: SlideTransition;
  transitionDuration?: string;
  transitionEasing?: string;
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
  /** Pre-rendered HTML for decks compiled without slide modules. */
  html?: string;
  nodes?: SlideNode[];
  render?: (props?: { components?: Record<string, unknown> }) => MaybePromise<DeckRenderable>;
  components?: ComponentPlaceholder[];
  notes?: string;
}

export interface CompiledDeck {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  meta: DeckFrontmatter;
  themeStyle?: string;
  themeSourcePath?: string;
  /** Omit generated client code for explicitly static compiled decks. */
  clientEntryRequired?: boolean;
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

export type DeckRequestContext<E extends Env = any> = Context<E>;

export interface DeckSource<E extends Env = any> {
  listDecks<RequestEnv extends E>(c: Context<RequestEnv>): Promise<DeckEntry[]>;
  getCompiledDeck<RequestEnv extends E>(c: Context<RequestEnv>, slug: string): Promise<CompiledDeck | null>;
  getAsset?<RequestEnv extends E>(c: Context<RequestEnv>, slug: string, assetPath: string): Promise<Response | null>;
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
