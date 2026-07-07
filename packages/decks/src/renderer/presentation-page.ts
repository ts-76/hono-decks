import type { CompiledDeck } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";
import { renderCompiledDeck, renderCompiledDeckAsync, renderCompiledSlideAsync } from "./compiled-render";
import { renderControlIconHtml } from "./control-icons";
import { renderClientEntryScript, renderLiveReloadScript, renderPresentationScript } from "./presentation-script";
import { basePresentationStyle } from "./presentation-style";

export function presentationPageTitle(deck: Pick<CompiledDeck, "slug" | "meta">): string {
  return deck.meta.title ?? deck.slug;
}

export function renderCompiledDeckPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
  speakerNotes?: boolean;
}): string {
  const { deck } = input;
  const warnings = renderWarnings(deck);
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = [
    input.printPreview ? 'data-hono-decks-print-preview="true"' : "",
    input.speakerNotes === false ? 'data-hono-decks-projection="true"' : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs.length ? ` ${bodyAttrs.join(" ")}` : ""}>
  ${warnings}
  ${renderCompiledDeck(deck, {
    components: mergeComponentInputs(deck.componentRegistry, input.components),
    speakerNotes: input.speakerNotes,
  })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

export async function renderCompiledDeckPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
  speakerNotes?: boolean;
}): Promise<string> {
  const { deck } = input;
  const warnings = renderWarnings(deck);
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = [
    input.printPreview ? 'data-hono-decks-print-preview="true"' : "",
    input.speakerNotes === false ? 'data-hono-decks-projection="true"' : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs.length ? ` ${bodyAttrs.join(" ")}` : ""}>
  ${warnings}
  ${await renderCompiledDeckAsync(deck, {
    components: mergeComponentInputs(deck.componentRegistry, input.components),
    speakerNotes: input.speakerNotes,
  })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

export async function renderPresenterPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
}): Promise<string> {
  const { deck } = input;
  const components = mergeComponentInputs(deck.componentRegistry, input.components);
  const mountPath = input.mountPath.replace(/\/$/, "") || "/";
  const deckPath = `${mountPath === "/" ? "" : mountPath}/${encodeURIComponent(deck.slug)}`;
  const projectionPath = `${deckPath}/presentation`;
  const previews = await Promise.all(
    deck.slides.map((slide) =>
      renderCompiledSlideAsync(slide, deck.assets, { components, deck, speakerNotes: false, slideState: "active" }),
    ),
  );
  const notes = deck.slides.map((slide) => slide.notes ?? slide.meta.notes);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))} - Presenter</title>
  <style>${basePresenterStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body>
  <main class="hono-decks-presenter" data-hono-decks-presenter data-slide-index="0">
    <section class="hono-decks-presenter-current" data-hono-decks-presenter-current aria-label="Current slide">
      <nav class="hono-decks-presenter-controls" data-hono-decks-presenter-controls aria-label="Presenter controls">
        <a href="${escapeHtml(mountPath)}" title="Deck list" aria-label="Deck list">${renderControlIconHtml("home")}</a>
        <a href="${escapeHtml(deckPath)}" title="Viewer" aria-label="Viewer">${renderControlIconHtml("viewer")}</a>
        <button type="button" data-action="openProjection" data-projection-url="${escapeHtml(projectionPath)}" title="Projection" aria-label="Projection">${renderControlIconHtml("projection")}</button>
        <button type="button" data-action="previous" title="Previous slide" aria-label="Previous slide">${renderControlIconHtml("previous")}</button>
        <span data-hono-decks-presenter-position>1 / ${deck.slides.length}</span>
        <button type="button" data-action="next" title="Next slide" aria-label="Next slide">${renderControlIconHtml("next")}</button>
        <span data-hono-decks-presenter-connection>Connected</span>
      </nav>
      <iframe title="${escapeHtml(presentationPageTitle(deck))}" src="${escapeHtml(projectionPath)}"></iframe>
    </section>
    <aside class="hono-decks-presenter-panel" aria-label="Presenter panel">
      <section class="hono-decks-presenter-next" data-hono-decks-presenter-next aria-label="Next slide preview">
        <h2>Next slide</h2>
        <div class="hono-decks-presenter-preview-list">
          ${previews
            .map(
              (preview, index) =>
                `<div class="hono-decks-presenter-preview" data-hono-decks-presenter-preview data-slide-index="${index}"${index === 1 ? "" : " hidden"}>${preview}</div>`,
            )
            .join("\n")}
          <p class="hono-decks-presenter-no-next" data-hono-decks-presenter-no-next${deck.slides.length > 1 ? " hidden" : ""}>No next slide</p>
        </div>
      </section>
      <section class="hono-decks-presenter-notes" data-hono-decks-presenter-notes aria-label="Speaker notes">
        <h2>Speaker notes</h2>
        ${notes
          .map(
            (note, index) =>
              `<article data-hono-decks-presenter-note data-slide-index="${index}"${index === 0 ? "" : " hidden"}>${note ? escapeHtml(note) : "<p>No speaker notes.</p>"}</article>`,
          )
          .join("\n")}
      </section>
    </aside>
  </main>
  ${renderPresenterScript(deck.slides.length)}
</body>
</html>`;
}

function renderWarnings(deck: CompiledDeck): string {
  return deck.warnings.length
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";
}

function mergeComponentInputs(
  base: Record<string, SlideComponentInput> | undefined,
  overrides: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): Record<string, SlideComponentInput> | SlideComponentRegistry | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  return { ...base, ...overrides };
}

function basePresenterStyle(): string {
  return `${basePresentationStyle()}
body{margin:0;min-height:100vh;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.hono-decks-presenter{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,2fr) minmax(320px,1fr);gap:16px;min-height:100vh;padding:16px}
.hono-decks-presenter-current,.hono-decks-presenter-panel{min-width:0}
.hono-decks-presenter-current{display:grid;grid-template-rows:auto 1fr;gap:12px;align-items:center}
.hono-decks-presenter-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.hono-decks-presenter-controls a,.hono-decks-presenter-controls button,.hono-decks-presenter-controls span{border:1px solid rgba(148,163,184,.32);border-radius:8px;background:rgba(15,23,42,.78);color:inherit;padding:8px 10px;font:inherit;font-size:14px}
.hono-decks-presenter-controls a,.hono-decks-presenter-controls button{display:inline-flex;align-items:center;justify-content:center;width:38px;min-height:38px;box-sizing:border-box;text-decoration:none;cursor:pointer}
.hono-decks-presenter-controls a *,.hono-decks-presenter-controls button *{pointer-events:none;cursor:pointer}
.hono-decks-control-icon{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;pointer-events:none}
.hono-decks-presenter-current iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:8px;background:#000}
.hono-decks-presenter-panel{display:grid;grid-template-rows:auto 1fr;gap:16px}
.hono-decks-presenter-next,.hono-decks-presenter-notes{min-width:0;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:rgba(15,23,42,.78);padding:12px}
.hono-decks-presenter-next h2,.hono-decks-presenter-notes h2{margin:0 0 8px;font-size:16px;color:#93c5fd}
.hono-decks-presenter-preview{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:6px;background:#020617}
body:not([data-overview-mode]) .hono-decks-presenter-preview .slide{position:absolute;inset:0 auto auto 0;width:var(--hono-decks-width);height:var(--hono-decks-height);aspect-ratio:16/9;max-width:none;transform-origin:left top;transition:none!important}
.hono-decks-presenter-preview .hono-decks-slide-content{transform-origin:top left}
.hono-decks-presenter-no-next:not([hidden]){display:grid;place-items:center;aspect-ratio:16/9;margin:0;border-radius:6px;background:#020617;color:#93a4bd;font-size:14px}
.hono-decks-presenter-notes article{white-space:pre-wrap;font-size:18px;line-height:1.6}
@media (max-width:900px){.hono-decks-presenter{grid-template-columns:1fr}.hono-decks-presenter-panel{grid-template-rows:auto auto}}`;
}

function renderPresenterScript(slideCount: number): string {
  return `<script>
(() => {
  const root = document.querySelector("[data-hono-decks-presenter]");
  const frame = document.querySelector("[data-hono-decks-presenter-current] iframe");
  const previews = Array.from(document.querySelectorAll("[data-hono-decks-presenter-preview]"));
  const notes = Array.from(document.querySelectorAll("[data-hono-decks-presenter-note]"));
  const noNext = document.querySelector("[data-hono-decks-presenter-no-next]");
  const position = document.querySelector("[data-hono-decks-presenter-position]");
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;

  function fitPresenterPreview(preview) {
    const slide = preview?.querySelector(".slide");
    if (!(preview instanceof HTMLElement) || !(slide instanceof HTMLElement)) return;
    const bounds = preview.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const scale = Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT);
    slide.style.transform = "scale(" + scale + ")";
  }

  function fitVisiblePresenterPreviews() {
    previews.forEach((preview) => {
      if (!preview.hidden) fitPresenterPreview(preview);
    });
  }

  function show(index) {
    const nextIndex = index + 1;
    root?.setAttribute("data-slide-index", String(index));
    if (position) position.textContent = String(index + 1) + " / ${slideCount}";
    previews.forEach((preview) => {
      preview.hidden = Number(preview.getAttribute("data-slide-index")) !== nextIndex;
    });
    if (noNext) noNext.hidden = previews.some((preview) => Number(preview.getAttribute("data-slide-index")) === nextIndex);
    notes.forEach((note) => {
      note.hidden = Number(note.getAttribute("data-slide-index")) !== index;
    });
    fitVisiblePresenterPreviews();
  }

  function sendCommand(action) {
    frame?.contentWindow?.postMessage({ type: "hono-decks:command", action }, window.location.origin);
  }

  function openProjection(button) {
    const projectionUrl = button.getAttribute("data-projection-url");
    if (!projectionUrl) return;
    const features = "popup=yes,width=1920,height=1080,left=0,top=0,menubar=no,toolbar=no,location=no,status=no";
    const projection = window.open(projectionUrl, "hono-decks-projection", features);
    projection?.focus?.();
  }

  fitVisiblePresenterPreviews();
  window.addEventListener("resize", fitVisiblePresenterPreviews);
  document.querySelectorAll("[data-action='previous']").forEach((button) => {
    button.addEventListener("click", () => sendCommand("previous"));
  });
  document.querySelectorAll("[data-action='next']").forEach((button) => {
    button.addEventListener("click", () => sendCommand("next"));
  });
  document.querySelectorAll("[data-action='openProjection']").forEach((button) => {
    button.addEventListener("click", () => openProjection(button));
  });

  window.addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow) return;
    if (event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.type !== "hono-decks:state") return;
    if (Number.isInteger(message.index)) show(message.index);
  });
})();
</script>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
