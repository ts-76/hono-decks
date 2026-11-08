import { enMessages } from "../../shared/messages";
import { resolveMessages, remoteMessages, formatMessage, type DeckMessageOverrides } from "../../shared/messages";
import { renderSVG } from "uqr";
import { epochNow, formatTalkTime, resolveTimerDisplay, talkPace } from "../../shared/talk-time";
import type { CompiledDeck } from "../../deck/model";
import { composeStylesheet, layer } from "../../renderer/style-layers";
import { documentNonceAttribute, type ResolvedDeckDocument } from "../document";

export const REMOTE_MESSAGES = remoteMessages(enMessages);

const style = layer(
  "components",
  `
.hono-decks-remote { --hono-decks-remote-bg:#0b1120;--hono-decks-remote-fg:#f8fafc;--hono-decks-remote-muted:#94a3b8;--hono-decks-remote-surface:#1e293b;--hono-decks-remote-accent:#2563eb;margin:0;background:var(--hono-decks-remote-bg);color:var(--hono-decks-remote-fg);font:16px/1.5 system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100% }
.hono-decks-remote-app { box-sizing:border-box;height:100vh;height:100dvh;max-width:640px;margin:0 auto;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:12px;padding:max(12px,env(safe-area-inset-top)) 16px max(12px,env(safe-area-inset-bottom)) }
.hono-decks-remote-title { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap }
.hono-decks-remote-bar { display:flex;align-items:center;gap:12px;font-size:14px;font-variant-numeric:tabular-nums;min-width:0 }
.hono-decks-remote-bar p { margin:0 }
.hono-decks-remote-status { display:flex;align-items:center;gap:6px;color:var(--hono-decks-remote-muted) }
@media (max-width:360px) { .hono-decks-remote-status { font-size:0;gap:0 } .hono-decks-remote-bar { gap:8px } }
.hono-decks-remote-status::before { content:"";width:8px;height:8px;border-radius:50%;background:#f59e0b }
.hono-decks-remote-status[data-state="connected"]::before { background:#22c55e }
.hono-decks-remote-status[data-state="disconnected"]::before { background:#ef4444 }
.hono-decks-remote-timer { margin-left:auto;display:flex;align-items:baseline;gap:8px;white-space:nowrap }
.hono-decks-remote-timer strong { font-size:20px }
.hono-decks-remote-timer [data-remote-elapsed][data-running="false"] { color:var(--hono-decks-remote-muted) }
.hono-decks-remote [data-pace="ahead"] { color:#86efac }
.hono-decks-remote [data-pace="behind"],.hono-decks-remote [data-over="true"] { color:#fda4af }
.hono-decks-remote-progress { height:4px;border-radius:2px;background:rgba(148,163,184,.25);overflow:hidden }
.hono-decks-remote-progress span { display:block;height:100%;width:calc(var(--hono-decks-remote-progress,0) * 100%);background:var(--hono-decks-remote-accent);transition:width .2s ease }
.hono-decks-remote-slides { display:grid;gap:4px }
.hono-decks-remote-slides p { margin:0;display:flex;align-items:baseline;gap:10px;min-width:0 }
.hono-decks-remote-slides span { flex:none;min-width:4.5em;font-size:12px;color:var(--hono-decks-remote-muted) }
.hono-decks-remote-slides strong,.hono-decks-remote-slides em { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal }
.hono-decks-remote-slides strong { font-size:18px }
.hono-decks-remote-slides em { color:var(--hono-decks-remote-muted) }
.hono-decks-remote-notes { margin:0;overflow:auto;overscroll-behavior:contain;border-top:1px solid rgba(148,163,184,.25);padding-top:12px;font-size:20px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere }
.hono-decks-remote-notes[data-empty="true"] { font-size:16px;color:var(--hono-decks-remote-muted) }
.hono-decks-remote-nav { display:grid;grid-template-columns:60px minmax(0,1fr) minmax(0,2fr);gap:10px }
.hono-decks-remote-nav button,.hono-decks-remote-list button { font:inherit;color:inherit;border:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none }
.hono-decks-remote-nav button { min-height:76px;border-radius:16px;background:var(--hono-decks-remote-surface);font-size:18px;font-weight:700 }
.hono-decks-remote-nav [data-remote-command="next"] { background:var(--hono-decks-remote-accent);font-size:22px }
.hono-decks-remote-nav button:active { transform:scale(.97) }
.hono-decks-remote-nav button:disabled { opacity:.4;transform:none }
.hono-decks-remote-nav svg { width:24px;height:24px;vertical-align:middle }
.hono-decks-remote-list { box-sizing:border-box;width:100%;max-width:640px;max-height:80dvh;margin:auto auto 0;padding:16px 16px max(16px,env(safe-area-inset-bottom));border:0;border-radius:16px 16px 0 0;background:#0f172a;color:var(--hono-decks-remote-fg) }
.hono-decks-remote-list::backdrop { background:rgba(2,6,23,.65) }
.hono-decks-remote-list header { display:flex;align-items:center;justify-content:space-between;margin-bottom:8px }
.hono-decks-remote-list h2 { margin:0;font-size:16px }
.hono-decks-remote-list ol { list-style:none;margin:0;padding:0 }
.hono-decks-remote-list li button { display:flex;gap:12px;width:100%;padding:12px;border-radius:10px;background:transparent;text-align:left;font-size:16px }
.hono-decks-remote-list li button span { color:var(--hono-decks-remote-muted);font-variant-numeric:tabular-nums;min-width:1.5em;text-align:right }
.hono-decks-remote-list li button[aria-current="true"] { background:var(--hono-decks-remote-surface) }
.hono-decks-remote-list header button { padding:8px 12px;border-radius:8px;background:var(--hono-decks-remote-surface) }
@media (prefers-reduced-motion:reduce) { .hono-decks-remote-nav button:active { transform:none } .hono-decks-remote-progress span { transition:none } }
.hono-decks-live { position:fixed;left:12px;bottom:12px;z-index:40;display:flex;align-items:center;gap:.5rem;padding:.3rem .4rem .3rem .7rem;border-radius:999px;background:rgba(15,23,42,.86);color:#fff;font:13px/1.2 system-ui }
.hono-decks-live > span:first-child { font-weight:700 }
.hono-decks-live:not(:has(button)) { padding-right:.7rem }
.hono-decks-live button { font:inherit;color:inherit;background:transparent;border:1px solid rgba(148,163,184,.45);border-radius:999px;padding:.25rem .65rem;cursor:pointer }
.hono-decks-remote-qr { box-sizing:border-box;width:min(340px,calc(100vw - 32px));margin:auto;padding:16px 20px 20px;border:0;border-radius:16px;background:#fff;color:#0f172a;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 24px 48px rgba(2,6,23,.35) }
.hono-decks-remote-qr::backdrop { background:rgba(2,6,23,.7) }
.hono-decks-remote-qr header { display:flex;align-items:center;justify-content:space-between;margin-bottom:8px }
.hono-decks-remote-qr h2 { margin:0;font-size:16px;font-weight:700 }
.hono-decks-remote-qr header button { display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font:inherit;font-size:18px;line-height:1;cursor:pointer }
.hono-decks-remote-qr svg { display:block;width:min(220px,60vw);height:auto;margin:4px auto 8px }
.hono-decks-remote-qr p { margin:0;text-align:center;font-size:13px;color:#475569;text-wrap:balance }
.hono-decks-remote-qr-url { margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0 }
.hono-decks-remote-qr-url span { display:block;margin-bottom:6px;font-size:12px;color:#64748b }
.hono-decks-remote-qr-url div { display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-radius:8px;background:#f1f5f9 }
.hono-decks-remote-qr-url code { flex:1;min-width:0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a;overflow-wrap:anywhere;user-select:all;-webkit-user-select:all }
.hono-decks-remote-qr-url button { flex:none;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a;font:inherit;font-size:12px;cursor:pointer }
`,
);

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function json(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function remoteStyle(nonce?: string): string {
  return `<style${documentNonceAttribute(nonce)}>${style}</style>`;
}
/** A presenter-only button that toggles `remoteQrPopover` through the Popover API, without script. */
export function remoteQrButton(messages: ReturnType<typeof remoteMessages> = REMOTE_MESSAGES): string {
  return `<button type="button" class="hono-decks-presenter-remote-qr" popovertarget="hono-decks-remote-qr" title="${escape(messages.qr)}" aria-label="${escape(messages.qr)}">QR</button>`;
}

/** A QR code for the remote control page. Render it outside the presenter toolbar. */
export function remoteQrPopover(url: string, messages: ReturnType<typeof remoteMessages> = REMOTE_MESSAGES): string {
  const svg = renderSVG(url, { border: 2 }).replace("<svg ", `<svg role="img" aria-label="${escape(messages.qr)}" `);
  // The URL is plain, selectable text with a copy button: following a link here would open the remote on the presenter's own screen.
  return `<div id="hono-decks-remote-qr" class="hono-decks-remote-qr" popover role="dialog" aria-labelledby="hono-decks-remote-qr-title"><header><h2 id="hono-decks-remote-qr-title">${escape(messages.title)}</h2><button type="button" popovertarget="hono-decks-remote-qr" popovertargetaction="hide" aria-label="${escape(messages.close)}">&times;</button></header>${svg}<p>${escape(messages.qrHint)}</p><div class="hono-decks-remote-qr-url"><span>${escape(messages.urlLabel)}</span><div><code data-remote-url>${escape(url)}</code><button type="button" data-remote-copy>${escape(messages.copy)}</button></div></div></div>`;
}

export function remoteIndicator(
  follower = true,
  messages: ReturnType<typeof remoteMessages> = REMOTE_MESSAGES,
): string {
  return `<aside class="hono-decks-live" data-remote-live><span>${escape(messages.live)}</span><span data-remote-status role="status">${escape(messages.connecting)}</span>${follower ? `<button type="button" data-remote-follow>${escape(messages.stop)}</button>` : ""}</aside>`;
}

export function renderRemotePage(
  deck: CompiledDeck,
  document: ResolvedDeckDocument,
  overrides?: DeckMessageOverrides,
  options: {
    duration?: number;
    display?: { pace: boolean; remaining: boolean; overtime: boolean };
    plan?: Array<number | null>;
  } = {},
): string {
  const catalog = resolveMessages(document.lang, overrides);
  const messages = remoteMessages(catalog);
  const display = options.display ?? resolveTimerDisplay();
  const slides = deck.slides.map((slide, i) => ({
    title: slide.meta.title || formatMessage(catalog.slide, { number: i + 1 }),
    notes: slide.notes ?? slide.meta.notes ?? "",
  }));
  const icon = (d: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const list = slides
    .map(
      (slide, i) =>
        `<li><button type="button" data-remote-goto="${i}"${i === 0 ? ' aria-current="true"' : ""}><span>${i + 1}</span>${escape(slide.title)}</button></li>`,
    )
    .join("");
  const timer = `<p class="hono-decks-remote-timer"><strong data-remote-elapsed data-running="false" role="timer" aria-label="${escape(messages.elapsed)}">00:00</strong><span data-remote-remaining aria-label="${escape(messages.remaining)}"${options.duration && display.remaining ? "" : " hidden"}></span><span data-remote-pace${options.duration && display.pace ? "" : " hidden"}></span></p>`;
  return `<!doctype html><html lang="${escape(document.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0b1120"><title>${escape(messages.title)}</title><style${documentNonceAttribute(document.nonce)}>${composeStylesheet({ layers: style })}</style>${document.head}</head><body class="hono-decks-remote"><main class="hono-decks-remote-app"><h1 class="hono-decks-remote-title">${escape(messages.title)}</h1><header class="hono-decks-remote-bar"><p class="hono-decks-remote-status" data-remote-status data-state="connecting" role="status">${escape(messages.connecting)}</p><p data-remote-position>${escape(formatMessage(catalog.progressText, { current: 1, total: slides.length }))}</p>${timer}</header><div class="hono-decks-remote-progress" aria-hidden="true"><span data-remote-progress></span></div><section class="hono-decks-remote-slides"><p><span>${escape(messages.current)}</span><strong data-remote-current>${escape(slides[0]?.title ?? "")}</strong></p><p><span>${escape(messages.nextSlide)}</span><em data-remote-next>${escape(slides[1]?.title ?? messages.noNext)}</em></p></section><section class="hono-decks-remote-notes" aria-label="${escape(messages.notes)}" data-remote-notes${slides[0]?.notes ? "" : ' data-empty="true"'}>${escape(slides[0]?.notes || messages.noNotes)}</section><nav class="hono-decks-remote-nav" aria-label="${escape(messages.title)}"><button type="button" data-remote-list-open aria-haspopup="dialog" aria-label="${escape(messages.slides)}" title="${escape(messages.slides)}">${icon("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01")}</button><button type="button" data-remote-command="previous" aria-label="${escape(messages.previous)}" disabled>${icon("M15 18l-6-6 6-6")}</button><button type="button" data-remote-command="next" disabled>${escape(messages.next)} ${icon("M9 18l6-6-6-6")}</button></nav></main><dialog class="hono-decks-remote-list" data-remote-list aria-label="${escape(messages.slides)}"><header><h2>${escape(messages.slides)}</h2><button type="button" data-remote-list-close>${escape(messages.close)}</button></header><ol>${list}</ol></dialog>${renderRemoteScript("remote", document.nonce, true, slides, messages, catalog.progressText, { duration: options.duration, display, plan: options.plan ?? slides.map(() => null) })}</body></html>`;
}

export function renderRemoteScript(
  mode: "viewer" | "presenter" | "remote",
  nonce?: string,
  follow = true,
  slides: Array<{ title: string; notes: string }> = [],
  messages: ReturnType<typeof remoteMessages> = REMOTE_MESSAGES,
  progressText = "{current} / {total}",
  talk: {
    duration?: number;
    display?: { pace: boolean; remaining: boolean; overtime: boolean };
    plan?: Array<number | null>;
  } = {},
): string {
  return `<script data-hono-decks-remote-runtime${documentNonceAttribute(nonce)}>
(() => {
  const mode = ${json(mode)}, messages = ${json(messages)}, slides = ${json(slides)}, progressText = ${json(progressText)};
  let duration = ${json(talk.duration ?? null)}, display = ${json(talk.display ?? resolveTimerDisplay())};
  const plan = ${json(talk.plan ?? slides.map(() => null))};
  const talkPace = ${talkPace.toString()}, formatTime = ${formatTalkTime.toString()}, epochNow = ${epochNow.toString()};
  const status = document.querySelector('[data-remote-status]'), toggle = document.querySelector('[data-remote-follow]');
  const frame = document.querySelector(mode === 'presenter' ? '[data-hono-decks-presenter-current] iframe' : '[data-hono-decks-viewer] iframe');
  const base = location.pathname.replace(/\\/(?:presenter|remote)\\/?$/, '');
  const url = new URL(base.replace(/\\/$/, '') + '/remote/socket', location.href);
  url.search = location.search; url.searchParams.set('role', mode === 'viewer' ? 'follower' : 'presenter');
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let socket, delay = 250, following = ${json(follow)}, live = null, last = null, roomEmpty = false, lastTimer = null, timer = null, wakeLock = null;
  let connected = false;
  function updateButtons() {
    const atStart = live && live.index === 0 && live.stepIndex === 0;
    document.querySelectorAll('[data-remote-command],[data-remote-goto]').forEach(button => { button.disabled = !connected || (button.dataset.remoteCommand === 'previous' && Boolean(atStart)); });
  }
  function setStatus(state, text) { connected = state === 'connected'; if (status) { status.textContent = text; status.dataset.state = state; } updateButtons(); }
  function showFollow() { if (toggle) { toggle.textContent = following ? messages.stop : messages.follow; toggle.setAttribute('aria-pressed', String(following)); } }
  function command(action, index, stepIndex) { frame?.contentWindow?.postMessage({ type: 'hono-decks:command', action, index, stepIndex }, location.origin); }
  function apply(position) { if (frame && position) command('goTo', position.index, position.stepIndex); }
  function send(value) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value)); }
  function showPosition(position) {
    const current = slides[position.index], next = slides[position.index + 1];
    const set = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    set('[data-remote-position]', progressText.replaceAll('{current}', String(position.index + 1)).replaceAll('{total}', String(slides.length)));
    set('[data-remote-current]', current?.title || ''); set('[data-remote-next]', next?.title || messages.noNext);
    const notes = document.querySelector('[data-remote-notes]');
    if (notes) { notes.textContent = current?.notes || messages.noNotes; notes.dataset.empty = String(!current?.notes); notes.scrollTop = 0; }
    document.querySelector('[data-remote-progress]')?.style.setProperty('--hono-decks-remote-progress', String((position.index + 1) / Math.max(slides.length, 1)));
    document.querySelectorAll('[data-remote-goto]').forEach(button => { if (Number(button.dataset.remoteGoto) === position.index) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); });
    updateButtons();
    renderTimer();
  }
  function renderTimer() {
    const elapsedNode = document.querySelector('[data-remote-elapsed]');
    if (!elapsedNode) return;
    const seconds = timer ? (timer.elapsed + (timer.running ? epochNow() - timer.receivedAt : 0)) / 1000 : 0;
    elapsedNode.textContent = formatTime(seconds);
    elapsedNode.dataset.running = String(Boolean(timer?.running));
    elapsedNode.title = timer ? '' : messages.notStarted;
    const remainingNode = document.querySelector('[data-remote-remaining]'), paceNode = document.querySelector('[data-remote-pace]');
    const remaining = duration ? duration - seconds : 0, over = Boolean(duration) && remaining < 0;
    const showRemaining = Boolean(duration) && (display.remaining || (over && display.overtime)), showPace = Boolean(duration) && display.pace;
    remainingNode?.toggleAttribute('hidden', !showRemaining); paceNode?.toggleAttribute('hidden', !showPace);
    if (showRemaining && remainingNode) {
      remainingNode.textContent = over ? (display.overtime ? messages.over + ' ' + formatTime(-remaining) : formatTime(0)) : '-' + formatTime(remaining);
      remainingNode.dataset.over = String(over && display.overtime);
    }
    if (!showPace || !paceNode) return;
    if (!timer || !live) { paceNode.textContent = ''; return; }
    const pace = talkPace(seconds, duration, live.index, plan);
    paceNode.dataset.pace = pace ? pace.state : 'appendix';
    paceNode.textContent = !pace ? messages.appendix : pace.state === 'on' ? messages.onPace : (pace.state === 'ahead' ? messages.ahead : messages.behind) + ' ' + formatTime(pace.seconds);
  }
  function connect() {
    setStatus('connecting', messages.connecting);
    socket = new WebSocket(url);
    socket.onopen = () => { delay = 250; setStatus('connected', messages.connected); if (mode === 'presenter' && lastTimer) send({ type: 'timer', ...lastTimer, elapsed: lastTimer.elapsed + (lastTimer.running ? epochNow() - lastTimer.at : 0) }); };
    socket.onmessage = event => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'timer' && mode === 'remote' && Number.isFinite(message.elapsed)) { timer = { elapsed: message.elapsed, running: Boolean(message.running), receivedAt: epochNow() }; if ('duration' in message) duration = Number.isFinite(message.duration) && message.duration > 0 ? message.duration : null; if (message.display && typeof message.display === 'object') display = { ...display, ...message.display }; renderTimer(); return; }
      if (message.type === 'empty') { roomEmpty = true; if (mode === 'presenter' && last) send({ type: 'state', ...last }); return; }
      if (message.type === 'state' && Number.isInteger(message.index) && Number.isInteger(message.stepIndex)) {
        roomEmpty = false;
        live = message;
        if (mode === 'remote') showPosition(message);
        else if ((mode === 'viewer' && following) || (mode === 'presenter' && (!last || last.index !== message.index || last.stepIndex !== message.stepIndex))) apply(message);
      } else if (mode === 'presenter' && message.type === 'command' && ['next', 'previous'].includes(message.command)) command(message.command);
    };
    socket.onclose = () => { setStatus('disconnected', messages.disconnected); setTimeout(connect, delay); delay = Math.min(delay * 2, 10000); };
    socket.onerror = () => socket.close();
  }
  function pause() { if (mode === 'viewer' && following) { following = false; showFollow(); } }
  if (mode === 'presenter') window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.type !== 'hono-decks:state') return;
    const { index, stepIndex } = event.data; if (!Number.isInteger(index) || !Number.isInteger(stepIndex)) return;
    last = { index, stepIndex }; if (live ? live.index !== index || live.stepIndex !== stepIndex : roomEmpty) send({ type: 'state', index, stepIndex });
  });
  if (mode === 'viewer') {
    toggle?.addEventListener('click', () => { following = !following; showFollow(); if (following) apply(live); });
    document.addEventListener('click', event => { if (event.target.closest('[data-action="next"],[data-action="previous"],[data-action="goTo"],[data-hono-decks-mobile-action]')) pause(); }, true);
    document.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight',' '].includes(event.key)) pause(); }, true);
    frame?.addEventListener('load', () => { try { const doc = frame.contentDocument; doc?.addEventListener('keydown', pause, true); doc?.addEventListener('touchstart', pause, true); } catch {} if (following) apply(live); });
    showFollow();
  }
  const copyButton = document.querySelector('[data-remote-copy]');
  copyButton?.addEventListener('click', async () => {
    const text = document.querySelector('[data-remote-url]')?.textContent || '';
    try { await navigator.clipboard.writeText(text); copyButton.textContent = messages.copied; setTimeout(() => { copyButton.textContent = messages.copy; }, 1500); }
    catch { const range = document.createRange(); const node = document.querySelector('[data-remote-url]'); if (node) { range.selectNodeContents(node); getSelection()?.removeAllRanges(); getSelection()?.addRange(range); } }
  });
  if (mode === 'presenter') document.addEventListener('hono-decks:timer', event => {
    const detail = event.detail; if (!detail || !Number.isFinite(detail.elapsed)) return;
    lastTimer = { elapsed: Math.floor(detail.elapsed), running: Boolean(detail.running), duration: Number.isFinite(detail.duration) && detail.duration > 0 ? detail.duration : null, ...(detail.display ? { display: detail.display } : {}), at: epochNow() };
    send({ type: 'timer', elapsed: lastTimer.elapsed, running: lastTimer.running, duration: lastTimer.duration, ...(lastTimer.display ? { display: lastTimer.display } : {}) });
  });
  function tap() { try { navigator.vibrate?.(12); } catch {} }
  document.querySelectorAll('[data-remote-command]').forEach(button => button.addEventListener('click', () => { tap(); send({ type: 'command', command: button.dataset.remoteCommand }); }));
  if (mode === 'remote') {
    const list = document.querySelector('[data-remote-list]');
    document.querySelector('[data-remote-list-open]')?.addEventListener('click', () => { list?.showModal(); list?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' }); });
    document.querySelector('[data-remote-list-close]')?.addEventListener('click', () => list?.close());
    list?.addEventListener('click', event => { if (event.target === list) list.close(); });
    document.querySelectorAll('[data-remote-goto]').forEach(button => button.addEventListener('click', () => { tap(); send({ type: 'command', command: 'goTo', index: Number(button.dataset.remoteGoto), stepIndex: 0 }); list?.close(); }));
    // Keep the phone awake while the remote is visible; the lock is released when the page is hidden.
    async function keepAwake() { try { if (!wakeLock && document.visibilityState === 'visible' && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch {} }
    document.addEventListener('visibilitychange', keepAwake);
    document.addEventListener('pointerdown', keepAwake, { once: true });
    keepAwake();
    setInterval(renderTimer, 1000);
    renderTimer();
  }
  connect();
})();
</script>`;
}
