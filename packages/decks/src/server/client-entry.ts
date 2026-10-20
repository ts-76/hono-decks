import type { Handler } from "hono";

export interface ServeDecksClientEntryOptions {
  cacheControl?: string | false;
  contentType?: string;
}

export function serveDecksClientEntry(
  clientEntry: string,
  options: ServeDecksClientEntryOptions = {},
): Handler {
  return (c) => {
    const headers: Record<string, string> = {
      "content-type": options.contentType ?? "text/javascript; charset=utf-8",
    };
    // The generated URL is stable while its content changes during editing/deploys.
    const cacheControl = options.cacheControl ?? "no-cache";
    if (cacheControl !== false) headers["cache-control"] = cacheControl;
    return c.body(clientEntry, 200, headers);
  };
}
