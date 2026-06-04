import type { Context } from "hono";

export type DeckKind = "directory" | "single-file";

export interface DeckFrontmatter {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  date?: string;
  theme?: string;
  draft?: boolean;
  assets?: string;
  presenter?: boolean;
  meta: Record<string, unknown>;
}

export interface SlideFrontmatter {
  title?: string;
  layout?: string;
  className?: string;
  notes?: string;
  background?: string;
  transition?: string;
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
  components: ComponentPlaceholder[];
  notes?: string;
}

export interface CompiledDeck {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  meta: DeckFrontmatter;
  slides: CompiledSlide[];
  assets: AssetRef[];
  warnings: CompileWarning[];
}

export interface DeckEntry {
  slug: string;
  title?: string;
  description?: string;
  draft?: boolean;
  sourcePath: string;
}

export interface DeckSource {
  listDecks(c: Context): Promise<DeckEntry[]>;
  getCompiledDeck(c: Context, slug: string): Promise<CompiledDeck | null>;
  getAsset?(c: Context, slug: string, assetPath: string): Promise<Response | null>;
}

export interface DeckManifest {
  decks: CompiledDeck[];
}
