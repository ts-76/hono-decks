import { epochNow, formatClock, formatTalkTime, resolveTimerDisplay, talkPace, talkPlan } from "../shared/talk-time";
import type { TalkTimerDisplay } from "../deck/model";
import { enMessages } from "../shared/messages";
import { parseDuration } from "../deck/duration";
import { renderOverflowChecker } from "./overflow-checker";
import { renderRemoteScript, remoteIndicator, remoteQrButton, remoteQrPopover, remoteStyle } from "../server/remote/ui";
import {
  resolveMessages,
  formatMessage,
  timerMessages as resolveTimerMessages,
  remoteMessages,
  type DeckMessageOverrides,
  type DeckMessages,
} from "../shared/messages";
import type { CompiledDeck } from "../deck/model";
import { localizedSlideComponents, type SlideComponentInput, type SlideComponentRegistry } from "./jsx-renderer";
import { renderCompiledDeck, renderCompiledDeckAsync, renderCompiledSlideAsync } from "./compiled-render";
import { renderControlIconHtml } from "./control-icons";
import { renderClientEntryScript, renderLiveReloadScript, renderPresentationScript } from "./presentation-script";
import { basePresentationStyle } from "./presentation-style";
import { composeStylesheet, layer } from "./style-layers";
import { documentNonceAttribute } from "../server/document";
import type { ResolvedDeckDocument } from "../server/document";

export const PRESENTER_TIMER_MESSAGES = resolveTimerMessages(enMessages);

export { formatTalkTime, talkPace };

export function presentationPageTitle(deck: Pick<CompiledDeck, "slug" | "meta">): string {
  return deck.meta.title ?? deck.slug;
}

export function renderCompiledDeckPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  dev?: boolean;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
  speakerNotes?: boolean;
  document?: ResolvedDeckDocument;
  messages?: DeckMessageOverrides;
}): string {
  const { deck } = input;
  const document = input.document ?? { lang: "ja", head: "" };
  const nonceAttribute = documentNonceAttribute(document.nonce);
  const warnings = renderWarnings(deck, resolveMessages(document.lang, input.messages));
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = [
    input.printPreview ? 'data-hono-decks-print-preview="true"' : "",
    input.speakerNotes === false ? 'data-hono-decks-projection="true"' : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style data-hono-decks-presentation-style${nonceAttribute}>${composeStylesheet({ layers: basePresentationStyle(), theme: deck.themeStyle, app: input.style })}</style>
  ${document.head}
</head>
<body${bodyAttrs.length ? ` ${bodyAttrs.join(" ")}` : ""}>
  ${warnings}
  ${renderCompiledDeck(deck, {
    components: {
      ...localizedSlideComponents(resolveMessages(document.lang, input.messages), document.nonce),
      ...mergeComponentInputs(deck.componentRegistry, input.components),
    },
    speakerNotes: input.speakerNotes,
  })}
  ${input.printPreview ? renderPrintPreviewScript(document.nonce) : renderPresentationScript(document.nonce)}
  ${!input.printPreview && input.dev ? renderOverflowChecker(document.nonce) : ""}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath, document.nonce) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry, document.nonce) : ""}
</body>
</html>`;
}

export async function renderCompiledDeckPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  dev?: boolean;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
  speakerNotes?: boolean;
  document?: ResolvedDeckDocument;
  messages?: DeckMessageOverrides;
}): Promise<string> {
  const { deck } = input;
  const document = input.document ?? { lang: "ja", head: "" };
  const nonceAttribute = documentNonceAttribute(document.nonce);
  const warnings = renderWarnings(deck, resolveMessages(document.lang, input.messages));
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = [
    input.printPreview ? 'data-hono-decks-print-preview="true"' : "",
    input.speakerNotes === false ? 'data-hono-decks-projection="true"' : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style data-hono-decks-presentation-style${nonceAttribute}>${composeStylesheet({ layers: basePresentationStyle(), theme: deck.themeStyle, app: input.style })}</style>
  ${document.head}
</head>
<body${bodyAttrs.length ? ` ${bodyAttrs.join(" ")}` : ""}>
  ${warnings}
  ${await renderCompiledDeckAsync(deck, {
    components: {
      ...localizedSlideComponents(resolveMessages(document.lang, input.messages), document.nonce),
      ...mergeComponentInputs(deck.componentRegistry, input.components),
    },
    speakerNotes: input.speakerNotes,
  })}
  ${input.printPreview ? renderPrintPreviewScript(document.nonce) : renderPresentationScript(document.nonce)}
  ${!input.printPreview && input.dev ? renderOverflowChecker(document.nonce) : ""}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath, document.nonce) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry, document.nonce) : ""}
</body>
</html>`;
}

export async function renderPresenterPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  presenterStateQuery?: string;
  duration?: number | string;
  /** Timer readouts shown by default; overrides the deck's `timer` frontmatter. */
  timerDisplay?: TalkTimerDisplay;
  remote?: boolean;
  /** Absolute remote control URL encoded in the presenter's QR code. */
  remoteUrl?: string;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  document?: ResolvedDeckDocument;
  messages?: DeckMessageOverrides;
}): Promise<string> {
  const { deck } = input;
  const document = input.document ?? { lang: "ja", head: "" };
  const nonceAttribute = documentNonceAttribute(document.nonce);
  const messages = resolveMessages(document.lang, input.messages);
  const components = {
    ...localizedSlideComponents(messages, document.nonce),
    ...mergeComponentInputs(deck.componentRegistry, input.components),
  };
  const mountPath = input.mountPath.replace(/\/$/, "") || "/";
  const deckPath = `${mountPath === "/" ? "" : mountPath}/${encodeURIComponent(deck.slug)}`;
  const stateQuery = input.presenterStateQuery ?? "";
  const deckHref = `${deckPath}${stateQuery}`;
  const projectionPath = `${deckPath}/presentation${stateQuery}`;
  const previews = await Promise.all(
    deck.slides.map((slide) =>
      renderCompiledSlideAsync(slide, deck.assets, { components, deck, speakerNotes: false, slideState: "active" }),
    ),
  );
  const duration = input.duration === undefined ? deck.meta.duration : parseDuration(input.duration, "seconds");
  const timerMessages = resolveTimerMessages(messages);
  const timerDisplay = resolveTimerDisplay(deck.meta.timer, input.timerDisplay);
  const plan = talkPlan(deck.slides);
  const notes = deck.slides.map((slide) => slide.notes ?? slide.meta.notes);

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(formatMessage(messages.presenterTitle, { title: presentationPageTitle(deck) }))}</title>
  <style${nonceAttribute}>${composeStylesheet({ layers: basePresenterStyle(), theme: deck.themeStyle, app: input.style })}</style>
  ${document.head}
</head>
<body>
  <main class="hono-decks-presenter" data-hono-decks-presenter data-slide-index="0">
    <section class="hono-decks-presenter-current" data-hono-decks-presenter-current aria-label="${escapeHtml(messages.currentSlide)}">
      <nav class="hono-decks-presenter-controls" data-hono-decks-presenter-controls aria-label="${escapeHtml(messages.presenterControls)}">
        <a href="${escapeHtml(mountPath)}" title="${escapeHtml(messages.deckList)}" aria-label="${escapeHtml(messages.deckList)}">${renderControlIconHtml("home")}</a>
        <a href="${escapeHtml(deckHref)}" title="${escapeHtml(messages.viewer)}" aria-label="${escapeHtml(messages.viewer)}">${renderControlIconHtml("viewer")}</a>
        <button type="button" data-action="openProjection" data-projection-url="${escapeHtml(projectionPath)}" title="${escapeHtml(messages.projection)}" aria-label="${escapeHtml(messages.projection)}">${renderControlIconHtml("projection")}</button>
        <button type="button" data-action="previous" title="${escapeHtml(messages.previous)}" aria-label="${escapeHtml(messages.previous)}">${renderControlIconHtml("previous")}</button>
        <span data-hono-decks-presenter-position>${escapeHtml(formatMessage(messages.progressText, { current: 1, total: deck.slides.length }))}</span>
        <button type="button" data-action="next" title="${escapeHtml(messages.next)}" aria-label="${escapeHtml(messages.next)}">${renderControlIconHtml("next")}</button>
        <span data-hono-decks-presenter-connection>${escapeHtml(messages.connected)}</span>
        ${input.remote && input.remoteUrl ? remoteQrButton(remoteMessages(messages)) : ""}
      </nav>
      <iframe title="${escapeHtml(presentationPageTitle(deck))}" src="${escapeHtml(projectionPath)}"></iframe>
    </section>
    <aside class="hono-decks-presenter-panel" aria-label="${escapeHtml(messages.presenterPanel)}">
      <section class="hono-decks-presenter-timer" aria-label="${escapeHtml(timerMessages.title)}">
        <h2>${escapeHtml(timerMessages.title)}</h2>
        <div class="hono-decks-presenter-timer-values">
          <div><span>${escapeHtml(timerMessages.elapsed)}</span><strong role="timer" aria-live="off" aria-label="${escapeHtml(timerMessages.elapsed)}" data-timer-elapsed>00:00</strong></div>
          <div><span>${escapeHtml(timerMessages.clock)}</span><strong role="timer" aria-live="off" aria-label="${escapeHtml(timerMessages.clock)}" data-timer-clock></strong></div>
          <div data-timer-remaining-box${duration && timerDisplay.remaining ? "" : " hidden"}><span>${escapeHtml(timerMessages.remaining)}</span><strong role="timer" aria-live="off" aria-label="${escapeHtml(timerMessages.remaining)}" data-timer-remaining></strong></div>
          <div class="hono-decks-presenter-timer-pace" data-timer-pace${duration && timerDisplay.pace ? "" : " hidden"}></div>
        </div>
        <div class="hono-decks-presenter-timer-controls"><button type="button" data-timer-toggle title="${escapeHtml(timerMessages.shortcut)}">${escapeHtml(timerMessages.start)}</button><button type="button" data-timer-reset>${escapeHtml(timerMessages.reset)}</button><label class="hono-decks-presenter-timer-target"><span>${escapeHtml(timerMessages.target)}</span><input type="number" min="1" max="1440" step="any" inputmode="decimal" data-timer-target value="${duration ? String(Math.round((duration / 60) * 10) / 10) : ""}"><span>${escapeHtml(timerMessages.minutes)}</span></label><button type="button" data-timer-target-default hidden>${escapeHtml(timerMessages.targetDefault)}</button><details class="hono-decks-presenter-timer-display"><summary>${escapeHtml(timerMessages.display)}</summary>${(
          [
            ["pace", timerMessages.paceLabel],
            ["remaining", timerMessages.remaining],
            ["overtime", timerMessages.overtimeLabel],
          ] as const
        )
          .map(
            ([key, label]) =>
              `<label><input type="checkbox" data-timer-show="${key}"${timerDisplay[key] ? " checked" : ""}>${escapeHtml(label)}</label>`,
          )
          .join("")}</details></div>
      </section>
      <section class="hono-decks-presenter-next" data-hono-decks-presenter-next aria-label="${escapeHtml(messages.nextPreview)}">
        <h2>${escapeHtml(messages.next)}</h2>
        <div class="hono-decks-presenter-preview-list">
          ${previews
            .map(
              (preview, index) =>
                `<div class="hono-decks-presenter-preview" data-hono-decks-presenter-preview data-slide-index="${index}"${index === 1 ? "" : " hidden"}>${preview}</div>`,
            )
            .join("\n")}
          <p class="hono-decks-presenter-no-next" data-hono-decks-presenter-no-next${deck.slides.length > 1 ? " hidden" : ""}>${escapeHtml(messages.noNext)}</p>
        </div>
      </section>
      <section class="hono-decks-presenter-notes" data-hono-decks-presenter-notes aria-label="${escapeHtml(messages.notes)}">
        <h2>${escapeHtml(messages.notes)}</h2>
        ${notes
          .map(
            (note, index) =>
              `<article data-hono-decks-presenter-note data-slide-index="${index}"${index === 0 ? "" : " hidden"}>${note ? escapeHtml(note) : `<p>${escapeHtml(messages.noNotes)}</p>`}</article>`,
          )
          .join("\n")}
      </section>
    </aside>
  </main>
  ${input.remote ? `${remoteStyle(document.nonce)}${input.remoteUrl ? remoteQrPopover(input.remoteUrl, remoteMessages(messages)) : ""}${remoteIndicator(false, remoteMessages(messages))}${renderRemoteScript("presenter", document.nonce, true, [], remoteMessages(messages))}` : ""}
  ${renderPresenterScript(deck.slides.length, deck.slug, duration, document.nonce, timerMessages, messages.progressText, { plan, display: timerDisplay })}
</body>
</html>`;
}

function renderWarnings(deck: CompiledDeck, messages: DeckMessages): string {
  const visibleWarnings = deck.warnings.filter((warning) => warning.code !== "external-asset-unverified");
  return visibleWarnings.length
    ? `<aside class="hono-decks-warnings" tabindex="0" aria-label="${escapeHtml(messages.warnings)}">${visibleWarnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";
}

function renderPrintPreviewScript(nonce?: string): string {
  return `<script${documentNonceAttribute(nonce)}>
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("autoprint") !== "1") return;
  window.addEventListener("load", () => {
    window.requestAnimationFrame(() => window.print());
  }, { once: true });
})();
  </script>`;
}

export function mergeComponentInputs(
  base: Record<string, SlideComponentInput> | undefined,
  overrides: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): Record<string, SlideComponentInput> | SlideComponentRegistry | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/** Presenter chrome on top of the presentation layers. */
function basePresenterStyle(): string {
  return [
    basePresentationStyle(),
    layer(
      "components",
      `
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
.hono-decks-presenter-panel{display:grid;grid-template-rows:auto auto 1fr;gap:16px}
.hono-decks-presenter-timer,.hono-decks-presenter-next,.hono-decks-presenter-notes{min-width:0;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:rgba(15,23,42,.78);padding:12px}
.hono-decks-presenter-timer h2,.hono-decks-presenter-next h2,.hono-decks-presenter-notes h2{margin:0 0 8px;font-size:16px;color:#93c5fd}
.hono-decks-presenter-timer-values{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:end}
.hono-decks-presenter-timer-values div{display:grid;gap:4px}.hono-decks-presenter-timer-values span{font-size:12px;color:var(--hono-decks-presenter-muted,#aabbd1)}
.hono-decks-presenter-timer-values strong{font-size:22px;font-variant-numeric:tabular-nums;color:var(--hono-decks-presenter-timer-color,#fff)}
.hono-decks-presenter-timer-values [data-pace="ahead"]{color:var(--hono-decks-presenter-ahead,#86efac)}
.hono-decks-presenter-timer-values [data-pace="behind"],.hono-decks-presenter-timer-values [data-over="true"]{color:var(--hono-decks-presenter-behind,#fda4af)}
.hono-decks-presenter-timer-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
.hono-decks-presenter-timer-pace{font-size:16px;font-weight:600}
.hono-decks-presenter-timer-values [hidden]{display:none}
.hono-decks-presenter-timer-target{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:14px;color:var(--hono-decks-presenter-muted,#aabbd1)}
.hono-decks-presenter-timer-target input{box-sizing:border-box;width:5em;font:inherit;font-size:14px;color:var(--hono-decks-presenter-timer-color,#fff);background:var(--hono-decks-presenter-button-background,#1e293b);border:1px solid var(--hono-decks-presenter-border,#64748b);border-radius:6px;padding:5px 8px;font-variant-numeric:tabular-nums}.hono-decks-presenter-timer-controls button{font:inherit;font-size:14px;color:inherit;background:var(--hono-decks-presenter-button-background,#1e293b);border:1px solid var(--hono-decks-presenter-border,#64748b);border-radius:6px;padding:6px 12px;cursor:pointer}
.hono-decks-presenter-timer-controls [data-timer-target-default]{font-size:13px;padding:5px 10px}
.hono-decks-presenter-timer-display{position:relative;font-size:14px}
.hono-decks-presenter-timer-display summary{cursor:pointer;list-style:none;border:1px solid var(--hono-decks-presenter-border,#64748b);border-radius:6px;padding:5px 10px;background:var(--hono-decks-presenter-button-background,#1e293b)}
.hono-decks-presenter-timer-display summary::-webkit-details-marker{display:none}
.hono-decks-presenter-timer-display[open] summary{border-color:#93c5fd}
.hono-decks-presenter-timer-display label{display:flex;align-items:center;gap:6px;padding:4px 0;white-space:nowrap}
.hono-decks-presenter-timer-display[open]>label:first-of-type{margin-top:6px}
.hono-decks-presenter-no-next:not([hidden]){display:grid;place-items:center;aspect-ratio:16/9;margin:0;border-radius:6px;background:#020617;color:#93a4bd;font-size:14px}
.hono-decks-presenter-notes article{white-space:pre-wrap;font-size:18px;line-height:1.6}
@media (max-width:900px){.hono-decks-presenter{grid-template-columns:1fr;padding-bottom:72px}.hono-decks-presenter-panel{grid-template-rows:auto auto auto}}`,
    ),
    layer(
      "runtime",
      `
@media (max-width:900px){html:has(.hono-decks-presenter),html:has(.hono-decks-presenter) body{height:auto;min-height:100%;overflow:auto;background:#050816}}
.hono-decks-presenter-preview{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:6px;background:#020617}
body:not([data-overview-mode]) .hono-decks-presenter-preview .slide{position:absolute;inset:0 auto auto 0;width:var(--hono-decks-width);height:var(--hono-decks-height);aspect-ratio:16/9;max-width:none;transform-origin:left top;transition:none!important}
.hono-decks-presenter-preview .hono-decks-slide-content{transform-origin:top left}`,
    ),
  ].join("\n");
}

function renderPresenterScript(
  slideCount: number,
  slug: string,
  duration: number | undefined,
  nonce?: string,
  messages: ReturnType<typeof resolveTimerMessages> = PRESENTER_TIMER_MESSAGES,
  progressText = "{current} / {total}",
  talk: { plan: Array<number | null>; display: Required<TalkTimerDisplay> } = {
    plan: Array.from({ length: slideCount }, () => null),
    display: resolveTimerDisplay(),
  },
): string {
  return `<script${documentNonceAttribute(nonce)}>
(() => {
  const root = document.querySelector("[data-hono-decks-presenter]");
  const frame = document.querySelector("[data-hono-decks-presenter-current] iframe");
  const previews = Array.from(document.querySelectorAll("[data-hono-decks-presenter-preview]"));
  const notes = Array.from(document.querySelectorAll("[data-hono-decks-presenter-note]"));
  const noNext = document.querySelector("[data-hono-decks-presenter-no-next]");
  const position = document.querySelector("[data-hono-decks-presenter-position]");
  const messages = ${JSON.stringify(messages).replaceAll("<", "\\u003c")};
  const progressText = ${JSON.stringify(progressText).replaceAll("<", "\\u003c")};
  const talkPace = ${talkPace.toString()};
  const plan = ${JSON.stringify(talk.plan)};
  const displayKey = ${JSON.stringify("hono-decks:timer-display:")} + ${JSON.stringify(slug).replaceAll("<", "\\u003c")};
  const display = ${JSON.stringify(talk.display)};
  try {
    // Readout choices made on this page override the configured defaults for this tab.
    const saved = JSON.parse(sessionStorage.getItem(displayKey) || "null");
    if (saved && typeof saved === "object") for (const key of ["pace", "remaining", "overtime"]) if (typeof saved[key] === "boolean") display[key] = saved[key];
  } catch (_) {}
  const durationKey = ${JSON.stringify("hono-decks:duration:")} + ${JSON.stringify(slug).replaceAll("<", "\\u003c")};
  const configuredDuration = ${JSON.stringify(duration ?? null)};
  let duration = configuredDuration;
  let durationOverridden = false;
  try {
    // A target typed on this page overrides the configured duration for this tab.
    const saved = JSON.parse(sessionStorage.getItem(durationKey) || "null");
    if (saved && (saved.seconds === null || (Number.isFinite(saved.seconds) && saved.seconds > 0))) { duration = saved.seconds; durationOverridden = true; }
  } catch (_) {}
  const storageKey = ${JSON.stringify("hono-decks:timer:")} + ${JSON.stringify(slug).replaceAll("<", "\\u003c")};
  const elapsedNode = document.querySelector("[data-timer-elapsed]");
  const clockNode = document.querySelector("[data-timer-clock]");
  const remainingNode = document.querySelector("[data-timer-remaining]");
  const paceNode = document.querySelector("[data-timer-pace]");
  const toggle = document.querySelector("[data-timer-toggle]");
  let timer = { elapsed: 0, startedAt: null };
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (saved && Number.isFinite(saved.elapsed) && saved.elapsed >= 0 && (saved.startedAt === null || Number.isFinite(saved.startedAt))) timer = saved;
  } catch (_) {}
  // The remote runtime relays this event so phones show the same timer.
  function announceTimer() { document.dispatchEvent(new CustomEvent("hono-decks:timer", { detail: { elapsed: elapsed(), running: timer.startedAt !== null, duration, display: { ...display } } })); }
  function saveTimer() { try { sessionStorage.setItem(storageKey, JSON.stringify(timer)); } catch (_) {} announceTimer(); }
  const epochNow = ${epochNow.toString()};
  const formatClock = ${formatClock.toString()};
  function elapsed() { return timer.elapsed + (timer.startedAt === null ? 0 : Math.max(0, epochNow() - timer.startedAt)); }
  announceTimer();
  const formatTime = ${formatTalkTime.toString()};
  function renderTimer() {
    const seconds = elapsed() / 1000;
    if (elapsedNode) elapsedNode.textContent = formatTime(seconds);
    if (clockNode) clockNode.textContent = formatClock(document.documentElement.lang || undefined);
    if (toggle) toggle.textContent = timer.startedAt !== null ? messages.pause : timer.elapsed ? messages.resume : messages.start;
    const remaining = duration ? duration - seconds : 0;
    const over = Boolean(duration) && remaining < 0;
    // Hidden remaining time still appears once the talk runs over, unless overtime is hidden too.
    const showRemaining = Boolean(duration) && (display.remaining || (over && display.overtime));
    document.querySelector("[data-timer-remaining-box]")?.toggleAttribute("hidden", !showRemaining);
    if (showRemaining && remainingNode) {
      remainingNode.textContent = over ? (display.overtime ? messages.over + " " + formatTime(-remaining) : formatTime(0)) : formatTime(remaining);
      remainingNode.dataset.over = String(over && display.overtime);
    }
    const showPace = Boolean(duration) && display.pace;
    paceNode?.toggleAttribute("hidden", !showPace);
    if (showPace && paceNode) {
      const pace = talkPace(seconds, duration, currentIndex, plan);
      paceNode.dataset.pace = pace ? pace.state : "appendix";
      paceNode.textContent = !pace ? messages.appendix : pace.state === "on" ? messages.onPace : (pace.state === "ahead" ? messages.ahead : messages.behind) + " " + formatTime(pace.seconds);
    }
  }
  const targetInput = document.querySelector("[data-timer-target]");
  const targetDefault = document.querySelector("[data-timer-target-default]");
  function showTarget() {
    if (targetInput) targetInput.value = duration ? String(Math.round((duration / 60) * 10) / 10) : "";
    if (targetDefault) targetDefault.hidden = !durationOverridden || duration === configuredDuration;
  }
  showTarget();
  targetInput?.addEventListener("change", () => {
    const minutes = Number.parseFloat(targetInput.value);
    duration = Number.isFinite(minutes) && minutes > 0 ? Math.min(Math.round(minutes * 60), 86400) : null;
    durationOverridden = true;
    try { sessionStorage.setItem(durationKey, JSON.stringify({ seconds: duration })); } catch (_) {}
    showTarget(); renderTimer(); announceTimer();
  });
  document.querySelectorAll("[data-timer-show]").forEach((input) => {
    const key = input.dataset.timerShow;
    input.checked = display[key];
    input.addEventListener("change", () => {
      display[key] = input.checked;
      try { sessionStorage.setItem(displayKey, JSON.stringify(display)); } catch (_) {}
      renderTimer(); announceTimer();
    });
  });
  targetDefault?.addEventListener("click", () => {
    duration = configuredDuration; durationOverridden = false;
    try { sessionStorage.removeItem(durationKey); } catch (_) {}
    showTarget(); renderTimer(); announceTimer(); targetInput?.focus();
  });
  toggle?.addEventListener("click", () => {
    if (timer.startedAt === null) timer.startedAt = epochNow();
    else { timer.elapsed = elapsed(); timer.startedAt = null; }
    saveTimer(); renderTimer();
  });
  document.querySelector("[data-timer-reset]")?.addEventListener("click", () => { timer = { elapsed: 0, startedAt: null }; saveTimer(); renderTimer(); });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "t" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) && !event.target?.isContentEditable) { event.preventDefault(); toggle?.click(); }
  });
  let ticker = null;
  function updateTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; if (!document.hidden) { renderTimer(); ticker = setInterval(renderTimer, 1000); } }
  document.addEventListener("visibilitychange", updateTicker);
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  let projectionWindow = null;
  let currentIndex = 0;
  let currentStepIndex = 0;

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

  function show(index, stepIndex = 0) {
    const nextIndex = index + 1;
    currentIndex = index;
    currentStepIndex = stepIndex;
    writePresenterPaginationState();
    root?.setAttribute("data-slide-index", String(index));
    if (position) position.textContent = progressText.replaceAll("{current}", String(index + 1)).replaceAll("{total}", "${slideCount}");
    previews.forEach((preview) => {
      preview.hidden = Number(preview.getAttribute("data-slide-index")) !== nextIndex;
    });
    if (noNext) noNext.hidden = previews.some((preview) => Number(preview.getAttribute("data-slide-index")) === nextIndex);
    notes.forEach((note) => {
      note.hidden = Number(note.getAttribute("data-slide-index")) !== index;
    });
    fitVisiblePresenterPreviews();
    renderTimer();
  }

  function writePresenterPaginationState() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set("slide", String(currentIndex + 1));
    params.set("step", String(currentStepIndex));
    window.history.replaceState(null, "", url);
  }

  function sendCommand(action) {
    const message = { type: "hono-decks:command", action };
    frame?.contentWindow?.postMessage(message, window.location.origin);
    if (projectionWindow?.closed) projectionWindow = null;
    projectionWindow?.postMessage(message, window.location.origin);
  }

  function syncProjectionState(source, index, stepIndex) {
    const message = { type: "hono-decks:command", action: "goTo", index, stepIndex };
    if (source !== frame?.contentWindow) frame?.contentWindow?.postMessage(message, window.location.origin);
    if (projectionWindow?.closed) projectionWindow = null;
    if (projectionWindow && source !== projectionWindow) projectionWindow.postMessage(message, window.location.origin);
  }

  function openProjection(button) {
    const projectionUrl = button.getAttribute("data-projection-url");
    if (!projectionUrl) return;
    const url = new URL(projectionUrl, window.location.href);
    url.searchParams.set("slide", String(currentIndex + 1));
    url.searchParams.set("step", String(currentStepIndex));
    const features = "popup=yes,width=1920,height=1080,left=0,top=0,menubar=no,toolbar=no,location=no,status=no";
    projectionWindow = window.open(url.href, "hono-decks-projection", features);
    projectionWindow?.focus?.();
    window.setTimeout(() => {
      projectionWindow?.postMessage(
        { type: "hono-decks:command", action: "goTo", index: currentIndex, stepIndex: currentStepIndex },
        window.location.origin,
      );
    }, 250);
  }

  updateTicker();
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
    if (event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.type !== "hono-decks:state") return;
    if (event.source !== frame?.contentWindow && event.source !== projectionWindow && !window.opener) return;
    if (event.source !== frame?.contentWindow) projectionWindow = event.source;
    if (Number.isInteger(message.index)) {
      const stepIndex = Number.isInteger(message.stepIndex) ? message.stepIndex : 0;
      const alreadyCurrent = message.index === currentIndex && stepIndex === currentStepIndex;
      show(message.index, stepIndex);
      if (!alreadyCurrent) syncProjectionState(event.source, message.index, stepIndex);
    }
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
