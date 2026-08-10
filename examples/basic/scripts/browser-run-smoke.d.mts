export interface BrowserRunDeck {
  slug: string;
  pages: number;
}

export interface BrowserRunPdfResult {
  slug: string;
  pages: number;
  bytes: number;
}

export declare const browserRunDecks: readonly BrowserRunDeck[];
export declare const defaultMaxPdfBytes: number;

export declare function parseBrowserRunOrigin(origin: string): URL;
export declare function buildBrowserRunExportUrl(origin: string, slug: string): string;
export declare function countPdfPages(bytes: Uint8Array | ArrayBuffer): Promise<number>;
export declare function assertBrowserRunPdfHeaders(response: Response, deck: BrowserRunDeck): void;
export declare function inspectBrowserRunPdfResponse(
  response: Response,
  body: Uint8Array,
  deck: BrowserRunDeck,
  maxBytes?: number,
): Promise<BrowserRunPdfResult>;
export declare function assertBrowserRunPdfResponse(
  response: Response,
  body: Uint8Array,
  deck: BrowserRunDeck,
  maxBytes?: number,
): Promise<BrowserRunPdfResult>;

export declare function smokeBrowserRun(input: {
  origin: string;
  token: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  decks?: readonly BrowserRunDeck[];
  artifactDir?: string;
  timeoutMs?: number;
  maxBytes?: number;
}): Promise<Array<BrowserRunPdfResult & { url: string }>>;
