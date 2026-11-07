import type { CompiledDeck } from "../deck/model";
import { documentNonceAttribute, type ResolvedDeckDocument } from "../server/document";
import { renderCompiledSlideAsync } from "./compiled-render";
import { renderControlIconHtml } from "./control-icons";
import type { SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";
import { mergeComponentInputs, presentationPageTitle } from "./presentation-page";
import { basePresentationStyle } from "./presentation-style";

export interface RenderDeckOverviewPageInput {
  deck: CompiledDeck;
  /** Viewer URL each thumbnail links to, with `?slide=N` appended. */
  viewerPath: string;
  /** 1-based slide to highlight and scroll into view (the viewer's current slide). */
  currentSlide?: number;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  document?: ResolvedDeckDocument;
}

/**
 * Renders every slide as a statically rendered thumbnail in a responsive grid.
 * Thumbnails keep the deck's theme and 1920×1080 composition and are scaled to
 * the grid column; each one opens the viewer at that slide.
 */
export async function renderDeckOverviewPageAsync(input: RenderDeckOverviewPageInput): Promise<string> {
  const { deck } = input;
  const document = input.document ?? { lang: "en", head: "" };
  const nonceAttribute = documentNonceAttribute(document.nonce);
  const components = mergeComponentInputs(deck.componentRegistry, input.components);
  const title = presentationPageTitle(deck);
  const count = deck.slides.length;
  const digits = String(count).length;
  const cards = await Promise.all(
    deck.slides.map(async (slide, position) => {
      const number = position + 1;
      const label = slide.meta.title ?? `Slide ${number}`;
      const href = `${input.viewerPath}?slide=${number}`;
      const current = input.currentSlide === number;
      const body = await renderCompiledSlideAsync(slide, deck.assets, {
        components,
        deck,
        speakerNotes: false,
        slideState: "active",
      });
      // Slides may contain their own links, so the thumbnail sits beside the card link
      // (never inside it) and the link's ::after stretches over the whole item.
      return `<li class="hono-decks-overview-item"><div class="hono-decks-overview-thumb" aria-hidden="true" inert><div class="hono-decks-deck">${body}</div></div><a class="hono-decks-overview-card" href="${escapeHtml(href)}" data-slide-number="${number}"${current ? ' aria-current="true"' : ""}><span class="hono-decks-overview-number">${String(number).padStart(digits, "0")}</span><span class="hono-decks-overview-label">${escapeHtml(label)}</span></a></li>`;
    }),
  );

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(`${title} - Overview`)}</title>
  <style data-hono-decks-presentation-style${nonceAttribute}>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}${overviewStyle()}</style>
  ${document.head}
</head>
<body data-hono-decks-overview>
  <header class="hono-decks-overview-header">
    <a class="hono-decks-overview-back" href="${escapeHtml(input.viewerPath)}">${renderControlIconHtml("previous")}<span>Viewer</span></a>
    <div class="hono-decks-overview-heading">
      <h1>${escapeHtml(title)}</h1>
      <p>${count} ${count === 1 ? "slide" : "slides"}</p>
    </div>
  </header>
  <main class="hono-decks-overview">
    <ol class="hono-decks-overview-grid" data-hono-decks-overview-grid>${cards.join("")}</ol>
  </main>
  ${renderOverviewScript(document.nonce)}
</body>
</html>`;
}

/** Page chrome uses px because the slide theme sets the root font size for the 1920×1080 canvas. */
function overviewStyle(): string {
  return `
html:has(body[data-hono-decks-overview]){height:auto;overflow:auto;background:#eceef2}
body[data-hono-decks-overview]{--hono-decks-overview-scale:.15;margin:0;min-height:100vh;overflow:auto;background:#eceef2;color:#16181d;font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hono-decks-overview-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:16px;padding:14px max(16px,4vw);background:rgba(236,238,242,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(22,24,29,.08)}
.hono-decks-overview-back{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px 0 8px;border:1px solid rgba(22,24,29,.14);border-radius:8px;background:#fff;color:inherit;font-weight:600;text-decoration:none}
.hono-decks-overview-back:hover{border-color:rgba(22,24,29,.32)}
.hono-decks-overview-back .hono-decks-control-icon{width:16px;height:16px;stroke:currentColor}
.hono-decks-overview-heading{display:flex;align-items:baseline;gap:12px;min-width:0}
.hono-decks-overview-heading h1{margin:0;overflow:hidden;font-size:17px;font-weight:700;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}
.hono-decks-overview-heading p{margin:0;flex:none;color:#5b616e;font-variant-numeric:tabular-nums}
.hono-decks-overview{padding:24px max(16px,4vw) 48px}
.hono-decks-overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:28px 20px;margin:0 auto;padding:0;max-width:1680px;list-style:none}
.hono-decks-overview-item{position:relative;display:grid;gap:10px;min-width:0}
.hono-decks-overview-card{display:flex;align-items:baseline;gap:10px;min-width:0;padding:0 2px;color:inherit;text-decoration:none;outline:none}
.hono-decks-overview-card::after{position:absolute;inset:0;border-radius:10px;content:""}
body[data-hono-decks-overview] .hono-decks-overview-thumb{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;border-radius:8px;background:var(--hono-decks-background,#fff);box-shadow:0 0 0 1px rgba(22,24,29,.1),0 1px 2px rgba(22,24,29,.06),0 8px 24px -12px rgba(22,24,29,.22);transition:box-shadow .16s ease,transform .16s ease;pointer-events:none}
body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-deck{position:absolute;inset:0;display:block;width:auto;height:auto;transform:none}
body[data-hono-decks-overview] .hono-decks-overview-thumb .slide{position:absolute;inset:0 auto auto 0;width:var(--hono-decks-width);max-width:none;height:var(--hono-decks-height);margin:0;transform:scale(var(--hono-decks-overview-scale));transform-origin:0 0;transition:none;visibility:visible;opacity:1}
body[data-hono-decks-overview] .hono-decks-overview-thumb [data-hono-decks-fire]{visibility:visible!important;opacity:1!important;transform:none!important;filter:none!important}
body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-embed-viewport iframe,body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-tweet-embed iframe,body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-tweet-embed .twitter-tweet{display:none!important}
body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-embed-print-fallback{display:grid;width:100%;height:100%;place-items:center;overflow:hidden;background:var(--hono-decks-card-background);color:var(--hono-decks-accent-color)}
body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-embed-print-fallback:has(.hono-decks-embed-print-poster){display:block}
body[data-hono-decks-overview] .hono-decks-overview-thumb .hono-decks-tweet-print-fallback{display:flex;min-height:12rem;align-items:center;justify-content:center;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);color:var(--hono-decks-accent-color)}
.hono-decks-overview-number{flex:none;color:#7a808c;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.hono-decks-overview-label{overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.hono-decks-overview-item:hover .hono-decks-overview-thumb{box-shadow:0 0 0 1px rgba(22,24,29,.22),0 2px 4px rgba(22,24,29,.08),0 14px 32px -14px rgba(22,24,29,.32)}
.hono-decks-overview-item:has(.hono-decks-overview-card:focus-visible) .hono-decks-overview-thumb,.hono-decks-overview-item:has([aria-current]) .hono-decks-overview-thumb{box-shadow:0 0 0 3px #2563eb,0 8px 24px -12px rgba(22,24,29,.3)}
.hono-decks-overview-card[aria-current] .hono-decks-overview-number{color:#2563eb}
@media (hover:hover) and (prefers-reduced-motion:no-preference){.hono-decks-overview-item:hover .hono-decks-overview-thumb{transform:translateY(-2px)}}
@media (prefers-color-scheme:dark){html:has(body[data-hono-decks-overview]),body[data-hono-decks-overview]{background:#14161b;color:#eceef2}.hono-decks-overview-header{background:rgba(20,22,27,.86);border-bottom-color:rgba(236,238,242,.08)}.hono-decks-overview-back{background:#1f2229;border-color:rgba(236,238,242,.14)}.hono-decks-overview-back:hover{border-color:rgba(236,238,242,.32)}.hono-decks-overview-heading p,.hono-decks-overview-number{color:#9aa0ab}body[data-hono-decks-overview] .hono-decks-overview-thumb{box-shadow:0 0 0 1px rgba(236,238,242,.1),0 8px 24px -12px rgba(0,0,0,.6)}.hono-decks-overview-item:hover .hono-decks-overview-thumb{box-shadow:0 0 0 1px rgba(236,238,242,.24),0 14px 32px -14px rgba(0,0,0,.7)}.hono-decks-overview-item:has(.hono-decks-overview-card:focus-visible) .hono-decks-overview-thumb,.hono-decks-overview-item:has([aria-current]) .hono-decks-overview-thumb{box-shadow:0 0 0 3px #60a5fa,0 8px 24px -12px rgba(0,0,0,.6)}.hono-decks-overview-card[aria-current] .hono-decks-overview-number{color:#60a5fa}}
`;
}

/** Scales thumbnails to the grid column and brings the viewer's current slide into view. */
function renderOverviewScript(nonce?: string): string {
  return `<script${documentNonceAttribute(nonce)}>
(() => {
  const grid = document.querySelector("[data-hono-decks-overview-grid]");
  const thumb = grid?.querySelector(".hono-decks-overview-thumb");
  if (!grid || !thumb) return;
  const width = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hono-decks-width")) || 1920;
  const fit = () => document.body.style.setProperty("--hono-decks-overview-scale", String(thumb.clientWidth / width));
  fit();
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(thumb);
  else window.addEventListener("resize", fit);
  const current = grid.querySelector("[aria-current]");
  if (current) {
    current.scrollIntoView({ block: "center" });
    current.focus({ preventScroll: true });
  }
})();
  </script>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
