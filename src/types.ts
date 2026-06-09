export interface Env {
  ASSETS: Fetcher;
  SlideAssistant: DurableObjectNamespace;
  LOADER: WorkerLoader;
  AI?: Ai;
  HONO_SLIDES_USE_WORKERS_AI?: string;
}

export interface SlideDeck {
  slides: Slide[];
  warnings: string[];
}

export interface Slide {
  index: number;
  title?: string;
  layout: string;
  className?: string;
  blocks: SlideBlock[];
  raw: string;
}

export type SlideBlock =
  | { type: "heading"; depth: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; lang?: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "image"; alt: string; src: string; title?: string }
  | { type: "component"; name: string; props: Record<string, string | boolean>; raw: string };

export interface AgentSuggestRequest {
  markdown: string;
  instruction: string;
  activeSlide?: number;
  slideCount?: number;
  useWorkersAI?: boolean;
  slug?: string;
  sessionId?: string;
  mode?: "chat" | "code";
}

export interface AgentSuggestResponse {
  suggestion: string;
  replacement?: string;
  source: "workers-ai" | "heuristic";
}
