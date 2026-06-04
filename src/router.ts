import { Hono } from "hono";
import type { Context } from "hono";
import { renderCompiledDeckPage } from "./compiled-render";
import type { DeckSource, LocalDeckIO } from "./deck";

export interface HonoSlidesAgentChatInput {
  slug: string;
  sessionId: string;
  markdown: string;
  instruction: string;
  activeSlide?: number;
}

export interface HonoSlidesRouterOptions {
  source: DeckSource;
  dev?: boolean | "auto";
  localDeckIO?: LocalDeckIO;
  agentChat?(input: HonoSlidesAgentChatInput, c: Context): Promise<unknown> | unknown;
  style?: string;
}

export function honoSlidesRouter(options: HonoSlidesRouterOptions): Hono {
  const router = new Hono();

  router.get("/", async (c) => {
    const decks = await options.source.listDecks(c);
    return c.html(renderDeckIndex(decks, c.req.path));
  });

  router.get("/:slug/assets/*", async (c) => {
    const slug = c.req.param("slug");
    const assetPath = extractAssetPath(c.req.path, slug);
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.json({ error: "Asset not found", slug, assetPath }, 404);
    return response;
  });

  if (isDevEnabled(options.dev)) {
    router.get("/:slug/edit", async (c) => {
      const slug = c.req.param("slug");
      const markdown = await options.localDeckIO?.readMarkdown(slug);
      if (markdown == null) return c.json({ error: "Deck source not found", slug }, 404);
      return c.html(renderEditorPage({ slug, markdown, mountPath: stripPathSuffix(c.req.path, `/${slug}/edit`) }));
    });

    router.post("/:slug/save", async (c) => {
      const slug = c.req.param("slug");
      if (!options.localDeckIO) return c.json({ error: "Local deck IO is not configured" }, 501);

      const payload = (await c.req.json()) as { markdown?: unknown };
      if (typeof payload.markdown !== "string") return c.json({ error: "markdown must be a string" }, 400);

      await options.localDeckIO.writeMarkdown(slug, payload.markdown);
      return c.json({ ok: true, slug });
    });

    router.get("/:slug/events", (c) => {
      const slug = c.req.param("slug");
      return new Response(`event: ready\ndata: ${JSON.stringify({ slug })}\n\n`, {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    });

    router.post("/:slug/agent/chat", async (c) => {
      const slug = c.req.param("slug");
      if (!options.localDeckIO) return c.json({ error: "Local deck IO is not configured" }, 501);
      if (!options.agentChat) return c.json({ error: "Agent chat is not configured" }, 501);

      const markdown = await options.localDeckIO.readMarkdown(slug);
      if (markdown == null) return c.json({ error: "Deck source not found", slug }, 404);

      const payload = (await c.req.json()) as {
        sessionId?: unknown;
        instruction?: unknown;
        activeSlide?: unknown;
      };
      const result = await options.agentChat(
        {
          slug,
          sessionId: typeof payload.sessionId === "string" && payload.sessionId ? payload.sessionId : "default",
          markdown,
          instruction: typeof payload.instruction === "string" ? payload.instruction : "",
          activeSlide: typeof payload.activeSlide === "number" ? payload.activeSlide : undefined,
        },
        c,
      );
      return result instanceof Response ? result : c.json(result);
    });
  }

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck) return c.json({ error: "Deck not found", slug }, 404);
    return c.html(
      renderCompiledDeckPage({
        deck,
        mountPath: stripPathSuffix(c.req.path, `/${slug}`),
        style: options.style,
      }),
    );
  });

  return router;
}

function isDevEnabled(dev: HonoSlidesRouterOptions["dev"]): boolean {
  return dev === true;
}

function extractAssetPath(path: string, slug: string): string {
  const marker = `/${slug}/assets/`;
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) return "";
  return path.slice(markerIndex + marker.length);
}

function stripPathSuffix(path: string, suffix: string): string {
  return path.endsWith(suffix) ? path.slice(0, -suffix.length) : path;
}

function renderDeckIndex(decks: Awaited<ReturnType<DeckSource["listDecks"]>>, mountPath: string): string {
  const basePath = mountPath.replace(/\/$/, "");
  const items = decks
    .map((deck) => {
      const href = `${basePath}/${encodeURIComponent(deck.slug)}`;
      const title = escapeHtml(deck.title ?? deck.slug);
      const description = deck.description ? `<p>${escapeHtml(deck.description)}</p>` : "";
      return `<li><a href="${href}">${title}</a>${description}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hono Slides</title>
</head>
<body>
  <main>
    <h1>Hono Slides</h1>
    <ul>${items}</ul>
  </main>
</body>
</html>`;
}

function renderEditorPage(input: { slug: string; markdown: string; mountPath: string }): string {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.slug)} editor</title>
</head>
<body>
  <main data-hono-slides-editor data-deck-slug="${escapeHtml(input.slug)}" data-mount-path="${escapeHtml(input.mountPath)}">
    <form method="post" action="${escapeHtml(`${input.mountPath}/${encodeURIComponent(input.slug)}/save`)}">
      <textarea name="markdown">${escapeHtml(input.markdown)}</textarea>
      <button type="submit">Save</button>
    </form>
    <section data-agent-chat></section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
