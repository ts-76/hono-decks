import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { applyDeckAgentProposal } from "./agent-apply";
import { createDeckAgentInstanceName, createDeckMarkdownHash, parseDeckAgentMode } from "./agent-contract";
import type { DeckAgentChatResult, DeckAgentMode } from "./agent-contract";
import { renderCompiledDeckPage } from "./compiled-render";
import type { DeckFileChange, DeckSource, LocalDeckIO } from "./deck";
import type { PreviewEvent, PreviewEventHub } from "./preview-events";

export interface HonoSlidesAgentChatInput {
  slug: string;
  sessionId: string;
  agentInstanceName: string;
  mode: DeckAgentMode;
  baseMarkdownHash: string;
  sourcePath?: string;
  markdown: string;
  instruction: string;
  activeSlide?: number;
}

export interface HonoSlidesRouterOptions {
  source: DeckSource;
  dev?: boolean | "auto";
  localDeckIO?: LocalDeckIO;
  previewEvents?: PreviewEventHub;
  onFileChange?(event: DeckFileChange, c: Context): Promise<void> | void;
  agentChat?(input: HonoSlidesAgentChatInput, c: Context): Promise<DeckAgentChatResult | Response> | DeckAgentChatResult | Response;
  style?: string;
}

export function honoSlidesRouter(options: HonoSlidesRouterOptions): Hono {
  const router = new Hono();

  router.get("/", async (c) => {
    const decks = (await options.source.listDecks(c)).filter((deck) => isDevEnabled(options) || !deck.draft);
    return c.html(renderDeckIndex(decks, c.req.path));
  });

  router.get("/:slug/assets/*", async (c) => {
    const slug = c.req.param("slug");
    const assetPath = extractAssetPath(c.req.path, slug);
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) {
      return c.json({ error: "Asset not found", slug, assetPath }, 404);
    }
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.json({ error: "Asset not found", slug, assetPath }, 404);
    return response;
  });

  if (isDevEnabled(options)) {
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
      await publishOrHandleFileChange(options, c, { type: "changed", path: await sourcePathForSlug(options, c, slug), slug }, "save");
      return c.json({ ok: true, slug });
    });

    router.get("/:slug/events", (c) => {
      const slug = c.req.param("slug");
      if (c.req.query("once") === "1" || !options.previewEvents?.subscribe) {
        return oneShotEventResponse(slug, options.previewEvents);
      }

      return streamSSE(c, async (stream) => {
        let unsubscribe = () => {};
        const aborted = new Promise<void>((resolve) => {
          stream.onAbort(() => {
            resolve();
          });
        });
        unsubscribe = options.previewEvents!.subscribe!(slug, (event) => {
          void stream.writeSSE(toServerSentMessage(event)).catch(() => {
            unsubscribe();
            stream.abort();
          });
        });

        try {
          await stream.writeSSE(toServerSentMessage({ type: "ready", slug }));
          for (const event of options.previewEvents?.drain(slug) ?? []) {
            await stream.writeSSE(toServerSentMessage(event));
          }
          await aborted;
        } finally {
          unsubscribe();
        }
      });
    });

    function oneShotEventResponse(slug: string, previewEvents: PreviewEventHub | undefined): Response {
      const events: PreviewEvent[] = [
        { type: "ready", slug },
        ...(previewEvents?.drain(slug) ?? []),
      ];
      return new Response(events.map(formatServerSentEvent).join(""), {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }

    router.post("/:slug/agent/chat", async (c) => {
      const slug = c.req.param("slug");
      if (!options.localDeckIO) return c.json({ error: "Local deck IO is not configured" }, 501);
      if (!options.agentChat) return c.json({ error: "Agent chat is not configured" }, 501);

      const savedMarkdown = await options.localDeckIO.readMarkdown(slug);
      if (savedMarkdown == null) return c.json({ error: "Deck source not found", slug }, 404);
      const deck = await options.source.getCompiledDeck(c, slug);

      const payload = (await c.req.json()) as {
        sessionId?: unknown;
        instruction?: unknown;
        activeSlide?: unknown;
        mode?: unknown;
        markdown?: unknown;
      };
      const markdown = typeof payload.markdown === "string" ? payload.markdown : savedMarkdown;
      const sessionId = typeof payload.sessionId === "string" && payload.sessionId ? payload.sessionId : "default";
      const result = await options.agentChat(
        {
          slug,
          sessionId,
          agentInstanceName: createDeckAgentInstanceName({ slug, sessionId }),
          mode: parseDeckAgentMode(payload.mode),
          baseMarkdownHash: createDeckMarkdownHash(markdown),
          sourcePath: deck?.sourcePath,
          markdown,
          instruction: typeof payload.instruction === "string" ? payload.instruction : "",
          activeSlide: parseActiveSlide(payload.activeSlide, deck?.slides.length),
        },
        c,
      );
      return result instanceof Response ? result : c.json(result);
    });

    router.post("/:slug/apply", async (c) => {
      const slug = c.req.param("slug");
      if (!options.localDeckIO) return c.json({ error: "Local deck IO is not configured" }, 501);

      const savedMarkdown = await options.localDeckIO.readMarkdown(slug);
      if (savedMarkdown == null) return c.json({ error: "Deck source not found", slug }, 404);
      const deck = await options.source.getCompiledDeck(c, slug);

      const payload = (await c.req.json()) as { proposal?: unknown; markdown?: unknown };
      const markdown = typeof payload.markdown === "string" ? payload.markdown : savedMarkdown;
      const applied = applyDeckAgentProposal(markdown, payload.proposal, { sourcePath: deck?.sourcePath ?? defaultSourcePath(slug) });
      if (!applied.ok) return c.json({ error: applied.error }, applied.status);

      await options.localDeckIO.writeMarkdown(slug, applied.markdown);
      await publishOrHandleFileChange(
        options,
        c,
        { type: "changed", path: deck?.sourcePath ?? defaultSourcePath(slug), slug },
        "apply",
      );
      return c.json({ ok: true, slug, baseMarkdownHash: applied.baseMarkdownHash, markdown: applied.markdown });
    });
  }

  router.get("/:slug/presentation", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/presentation`);
    return c.html(
      renderCompiledDeckPage({
        deck,
        mountPath,
        style: options.style,
        liveReloadPath: isDevEnabled(options) ? `${mountPath}/${encodeURIComponent(slug)}/events` : undefined,
      }),
    );
  });

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}`);
    return c.html(renderDeckViewerPage({ slug, title: deck.meta.title ?? slug, mountPath }));
  });

  return router;
}

function isDevEnabled(options: HonoSlidesRouterOptions): boolean {
  return options.dev === true || (options.dev === "auto" && Boolean(options.localDeckIO));
}

function defaultSourcePath(slug: string): string {
  return `decks/${slug}.mdx`;
}

function parseActiveSlide(value: unknown, slideCount?: number): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return undefined;
  return slideCount == null || value < slideCount ? value : undefined;
}

async function sourcePathForSlug(options: HonoSlidesRouterOptions, c: Context, slug: string): Promise<string> {
  const deck = await options.source.getCompiledDeck(c, slug);
  return deck?.sourcePath ?? defaultSourcePath(slug);
}

async function publishOrHandleFileChange(
  options: HonoSlidesRouterOptions,
  c: Context,
  event: DeckFileChange,
  fallbackSource: "save" | "apply",
): Promise<void> {
  if (options.onFileChange) {
    await options.onFileChange(event, c);
    return;
  }
  options.previewEvents?.publish({ type: "deck:updated", slug: event.slug ?? "", data: { source: fallbackSource } });
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

function formatServerSentEvent(event: PreviewEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify({ slug: event.slug, ...(event.data !== undefined ? { data: event.data } : {}) })}\n\n`;
}

function toServerSentMessage(event: PreviewEvent): { event: PreviewEvent["type"]; data: string } {
  return {
    event: event.type,
    data: JSON.stringify({ slug: event.slug, ...(event.data !== undefined ? { data: event.data } : {}) }),
  };
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
  const saveUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/save`;
  const agentUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/agent/chat`;
  const applyUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/apply`;
  const previewUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.slug)} editor</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; color: #172033; background: #f7f8fb; }
    body { margin: 0; }
    main { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(360px, 1fr); gap: 16px; min-height: 100vh; padding: 16px; }
    form, aside, iframe { min-width: 0; }
    label { display: block; margin: 0 0 6px; font-size: 13px; color: #4f5f79; }
    textarea, input { width: 100%; border: 1px solid #cfd7e6; border-radius: 8px; padding: 10px; background: #fff; color: inherit; }
    textarea { min-height: calc(100vh - 108px); resize: vertical; font: 14px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; }
    button { border: 1px solid #b9c4d8; border-radius: 8px; padding: 8px 12px; background: #fff; color: #172033; cursor: pointer; }
    button.primary { border-color: #315fce; background: #315fce; color: #fff; }
    button:disabled { opacity: .55; cursor: wait; }
    .toolbar { display: flex; gap: 8px; align-items: center; margin: 10px 0 0; }
    .panel { border: 1px solid #d9e0ec; border-radius: 8px; background: #fff; padding: 12px; }
    .panel + .panel { margin-top: 12px; }
    iframe { width: 100%; aspect-ratio: 16 / 9; border: 1px solid #d9e0ec; border-radius: 8px; background: #0b1020; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0 0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body>
  <main data-hono-slides-editor data-deck-slug="${escapeHtml(input.slug)}" data-mount-path="${escapeHtml(input.mountPath)}">
    <form id="editorForm" method="post" action="${escapeHtml(saveUrl)}">
      <label for="markdown">MDX</label>
      <textarea id="markdown" name="markdown" spellcheck="false">${escapeHtml(input.markdown)}</textarea>
      <div class="toolbar">
        <button class="primary" id="saveButton" type="submit">Save</button>
        <span id="saveStatus" role="status"></span>
      </div>
    </form>
    <aside>
      <section class="panel" data-agent-chat>
        <label for="instruction">Agent instruction</label>
        <input id="instruction" value="このデックを読みやすくして" />
        <div class="toolbar">
          <button id="agentButton" type="button">Ask Agent</button>
          <button id="applyProposalButton" type="button" disabled>Apply</button>
        </div>
        <pre id="agentOutput" aria-live="polite"></pre>
      </section>
      <section class="panel">
        <iframe id="previewFrame" title="Deck preview" src="${escapeHtml(previewUrl)}"></iframe>
        <pre id="eventOutput" aria-live="polite"></pre>
      </section>
    </aside>
  </main>
  <script>
    const root = document.querySelector("[data-hono-slides-editor]");
    const markdown = document.querySelector("#markdown");
    const instruction = document.querySelector("#instruction");
    const form = document.querySelector("#editorForm");
    const saveButton = document.querySelector("#saveButton");
    const saveStatus = document.querySelector("#saveStatus");
    const agentButton = document.querySelector("#agentButton");
    const applyProposalButton = document.querySelector("#applyProposalButton");
    const agentOutput = document.querySelector("#agentOutput");
    const eventOutput = document.querySelector("#eventOutput");
    const previewFrame = document.querySelector("#previewFrame");
    const slug = root.dataset.deckSlug;
    const mountPath = root.dataset.mountPath;
    const saveUrl = ${JSON.stringify(saveUrl)};
    const agentUrl = ${JSON.stringify(agentUrl)};
    const applyUrl = ${JSON.stringify(applyUrl)};
    const previewUrl = ${JSON.stringify(previewUrl)};
    const eventsUrl = mountPath + "/" + encodeURIComponent(slug) + "/events";
    let pendingProposal;

    function reloadPreview() {
      if (!previewFrame) return;
      previewFrame.src = previewUrl + "?t=" + String(Date.now());
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      saveButton.disabled = true;
      saveStatus.textContent = "Saving...";
      try {
        const response = await fetch(saveUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markdown: markdown.value }),
        });
        if (!response.ok) throw new Error(await response.text());
        saveStatus.textContent = "Saved";
        reloadPreview();
      } catch (error) {
        saveStatus.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        saveButton.disabled = false;
      }
    });

    agentButton.addEventListener("click", async () => {
      agentButton.disabled = true;
      applyProposalButton.disabled = true;
      pendingProposal = undefined;
      agentOutput.textContent = "Thinking...";
      try {
        const response = await fetch(agentUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instruction: instruction.value, mode: "code", markdown: markdown.value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));
        pendingProposal = data.proposal;
        agentOutput.textContent = data.suggestion || data.message || JSON.stringify(data, null, 2);
        applyProposalButton.disabled = !pendingProposal;
      } catch (error) {
        agentOutput.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        agentButton.disabled = false;
      }
    });

    applyProposalButton.addEventListener("click", async () => {
      if (!pendingProposal) return;
      applyProposalButton.disabled = true;
      try {
        const response = await fetch(applyUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proposal: pendingProposal, markdown: markdown.value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));
        if (typeof data.markdown === "string") markdown.value = data.markdown;
        agentOutput.textContent = "Applied";
        reloadPreview();
        pendingProposal = undefined;
      } catch (error) {
        agentOutput.textContent = error instanceof Error ? error.message : String(error);
        applyProposalButton.disabled = false;
      }
    });

    try {
      const events = new EventSource(eventsUrl);
      events.addEventListener("deck:updated", (event) => { eventOutput.textContent = event.data; reloadPreview(); });
      events.addEventListener("deck:error", (event) => { eventOutput.textContent = event.data; });
    } catch {
      eventOutput.textContent = "";
    }
  </script>
</body>
</html>`;
}

function renderDeckViewerPage(input: { slug: string; title: string; mountPath: string }): string {
  const presentationUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/presentation`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: dark; background: #050816; color: #eef2ff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; overflow: hidden; }
    [data-hono-slides-viewer] { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at top, #1e2b5c, #050816 62%); }
    .hono-slides-viewport { width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); position: relative; overflow: hidden; }
    .hono-slides-frame-stage { width: 1920px; height: 1080px; transform-origin: top left; }
    iframe { width: 1920px; height: 1080px; border: 0; display: block; background: #0b1020; }
    .hono-slides-viewer-controls { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 999px; background: rgba(5, 8, 22, .72); backdrop-filter: blur(12px); }
    .hono-slides-viewer-controls button { border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(255,255,255,.1); color: inherit; padding: 8px 12px; cursor: pointer; }
  </style>
</head>
<body>
  <main data-hono-slides-viewer data-deck-slug="${escapeHtml(input.slug)}">
    <div class="hono-slides-viewport" data-viewer-viewport>
      <div class="hono-slides-frame-stage" data-viewer-stage>
        <iframe title="${escapeHtml(input.title)} presentation" src="${escapeHtml(presentationUrl)}" width="1920" height="1080" allowfullscreen></iframe>
      </div>
    </div>
    <nav class="hono-slides-viewer-controls" aria-label="Viewer controls">
      <button type="button" data-action="previous">Prev</button>
      <span data-slide-position>1 / ?</span>
      <button type="button" data-action="next">Next</button>
      <button type="button" data-action="fullscreen">Full</button>
    </nav>
  </main>
  <script>
(() => {
  const viewport = document.querySelector("[data-viewer-viewport]");
  const stage = document.querySelector("[data-viewer-stage]");
  const iframe = document.querySelector("iframe");
  const position = document.querySelector("[data-slide-position]");
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  function resize() {
    if (!viewport || !stage) return;
    const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
    stage.style.transform = "scale(" + scale + ")";
    viewport.style.width = String(DESIGN_WIDTH * scale) + "px";
    viewport.style.height = String(DESIGN_HEIGHT * scale) + "px";
  }

  function sendCommand(action) {
    iframe?.contentWindow?.postMessage({ type: "hono-slides:command", action }, "*");
  }

  document.querySelector("[data-action='previous']")?.addEventListener("click", () => sendCommand("previous"));
  document.querySelector("[data-action='next']")?.addEventListener("click", () => sendCommand("next"));
  document.querySelector("[data-action='fullscreen']")?.addEventListener("click", () => sendCommand("fullscreen"));
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-slides:state") return;
    if (position) position.textContent = String(message.index + 1) + " / " + String(message.slideCount);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") sendCommand("next");
    if (event.key === "ArrowLeft") sendCommand("previous");
    if (event.key === "f") sendCommand("fullscreen");
  });

  window.addEventListener("resize", resize);
  resize();
})();
  </script>
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
