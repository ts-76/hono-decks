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
    const cacheControl = options.cacheControl ?? "public, max-age=300";
    if (cacheControl !== false) headers["cache-control"] = cacheControl;
    return c.body(clientEntry, 200, headers);
  };
}
