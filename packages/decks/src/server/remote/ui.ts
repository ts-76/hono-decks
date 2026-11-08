import { enMessages } from "../../shared/messages";
import { resolveMessages, remoteMessages, formatMessage, type DeckMessageOverrides } from "../../shared/messages";
import { renderSVG } from "uqr";
import type { CompiledDeck } from "../../deck/model";
import { composeStylesheet, layer } from "../../renderer/style-layers";
import { documentNonceAttribute, type ResolvedDeckDocument } from "../document";

export const REMOTE_MESSAGES = remoteMessages(enMessages);

const style = layer(
  "components",
  `
.hono-decks-remote { --hono-decks-remote-bg:#111827; --hono-decks-remote-fg:#fff; background:var(--hono-decks-remote-bg);color:var(--hono-decks-remote-fg);font:16px system-ui;min-height:100vh;margin:0;padding:1.5rem;box-sizing:border-box }
.hono-decks-remote main { max-width:40rem;margin:auto;display:grid;gap:1.5rem }
.hono-decks-remote h1,.hono-decks-remote h2,.hono-decks-remote p { margin:0 }
.hono-decks-remote h2 { font-size:.9rem;opacity:.7;margin-bottom:.4rem }
.hono-decks-remote-nav { display:grid;grid-template-columns:1fr 1fr;gap:1rem }
.hono-decks-remote button { font:inherit;min-height:3rem;border:0;border-radius:.6rem;padding:1rem;cursor:pointer }
.hono-decks-remote-nav button { min-height:6rem;font-size:1.25rem;font-weight:700 }
.hono-decks-live { position:fixed;left:12px;bottom:12px;z-index:40;display:flex;align-items:center;gap:.5rem;padding:.3rem .4rem .3rem .7rem;border-radius:999px;background:rgba(15,23,42,.86);color:#fff;font:13px/1.2 system-ui }
.hono-decks-live > span:first-child { font-weight:700 }
.hono-decks-live:not(:has(button)) { padding-right:.7rem }
.hono-decks-live button { font:inherit;color:inherit;background:transparent;border:1px solid rgba(148,163,184,.45);border-radius:999px;padding:.25rem .65rem;cursor:pointer }
.hono-decks-presenter-controls a.hono-decks-presenter-remote-link { width:auto;white-space:nowrap }
.hono-decks-remote-qr { margin:auto;padding:20px;border:0;border-radius:12px;background:#fff;color:#0f172a;text-align:center;max-width:min(360px,calc(100vw - 32px));font:14px/1.5 system-ui }
.hono-decks-remote-qr::backdrop { background:rgba(2,6,23,.7) }
.hono-decks-remote-qr svg { display:block;width:min(260px,70vw);height:auto;margin:0 auto 12px }
.hono-decks-remote-qr p { margin:4px 0 }
.hono-decks-remote-qr a { color:inherit;word-break:break-all;font-size:12px }
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
  return `<div id="hono-decks-remote-qr" class="hono-decks-remote-qr" popover>${svg}<p>${escape(messages.qrHint)}</p><p><a href="${escape(url)}">${escape(url)}</a></p></div>`;
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
): string {
  const catalog = resolveMessages(document.lang, overrides);
  const messages = remoteMessages(catalog);
  const slides = deck.slides.map((slide, i) => ({
    title: slide.meta.title || String(i + 1),
    notes: slide.notes ?? slide.meta.notes ?? "",
  }));
  return `<!doctype html><html lang="${escape(document.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(messages.title)}</title><style${documentNonceAttribute(document.nonce)}>${composeStylesheet({ layers: style })}</style>${document.head}</head><body class="hono-decks-remote"><main><h1>${escape(messages.title)}</h1><p data-remote-status role="status">${escape(messages.connecting)}</p><p data-remote-position>${escape(formatMessage(catalog.progressText, { current: 1, total: slides.length }))}</p><section><h2>${escape(messages.current)}</h2><p data-remote-current>${escape(slides[0]?.title ?? "")}</p></section><section><h2>${escape(messages.nextSlide)}</h2><p data-remote-next>${escape(slides[1]?.title ?? messages.noNext)}</p></section><nav class="hono-decks-remote-nav"><button type="button" data-remote-command="previous">${escape(messages.previous)}</button><button type="button" data-remote-command="next">${escape(messages.next)}</button></nav><details><summary>${escape(messages.notes)}</summary><p data-remote-notes>${escape(slides[0]?.notes || messages.noNotes)}</p></details></main>${renderRemoteScript("remote", document.nonce, true, slides, messages, catalog.progressText)}</body></html>`;
}

export function renderRemoteScript(
  mode: "viewer" | "presenter" | "remote",
  nonce?: string,
  follow = true,
  slides: Array<{ title: string; notes: string }> = [],
  messages: ReturnType<typeof remoteMessages> = REMOTE_MESSAGES,
  progressText = "{current} / {total}",
): string {
  return `<script data-hono-decks-remote-runtime${documentNonceAttribute(nonce)}>
(() => {
  const mode = ${json(mode)}, messages = ${json(messages)}, slides = ${json(slides)}, progressText = ${json(progressText)};
  const status = document.querySelector('[data-remote-status]'), toggle = document.querySelector('[data-remote-follow]');
  const frame = document.querySelector(mode === 'presenter' ? '[data-hono-decks-presenter-current] iframe' : '[data-hono-decks-viewer] iframe');
  const base = location.pathname.replace(/\\/(?:presenter|remote)\\/?$/, '');
  const url = new URL(base.replace(/\\/$/, '') + '/remote/socket', location.href);
  url.search = location.search; url.searchParams.set('role', mode === 'viewer' ? 'follower' : 'presenter');
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let socket, delay = 250, following = ${json(follow)}, live = null, last = null, roomEmpty = false;
  function showFollow() { if (toggle) { toggle.textContent = following ? messages.stop : messages.follow; toggle.setAttribute('aria-pressed', String(following)); } }
  function command(action, index, stepIndex) { frame?.contentWindow?.postMessage({ type: 'hono-decks:command', action, index, stepIndex }, location.origin); }
  function apply(position) { if (frame && position) command('goTo', position.index, position.stepIndex); }
  function send(value) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value)); }
  function showPosition(position) {
    const current = slides[position.index], next = slides[position.index + 1];
    const set = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    set('[data-remote-position]', progressText.replaceAll('{current}', String(position.index + 1)).replaceAll('{total}', String(slides.length)));
    set('[data-remote-current]', current?.title || ''); set('[data-remote-next]', next?.title || messages.noNext);
    set('[data-remote-notes]', current?.notes || messages.noNotes);
  }
  function connect() {
    if (status) status.textContent = messages.connecting;
    socket = new WebSocket(url);
    socket.onopen = () => { delay = 250; if (status) status.textContent = messages.connected; };
    socket.onmessage = event => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'empty') { roomEmpty = true; if (mode === 'presenter' && last) send({ type: 'state', ...last }); return; }
      if (message.type === 'state' && Number.isInteger(message.index) && Number.isInteger(message.stepIndex)) {
        roomEmpty = false;
        live = message;
        if (mode === 'remote') showPosition(message);
        else if ((mode === 'viewer' && following) || (mode === 'presenter' && (!last || last.index !== message.index || last.stepIndex !== message.stepIndex))) apply(message);
      } else if (mode === 'presenter' && message.type === 'command' && ['next', 'previous'].includes(message.command)) command(message.command);
    };
    socket.onclose = () => { if (status) status.textContent = messages.disconnected; setTimeout(connect, delay); delay = Math.min(delay * 2, 10000); };
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
  document.querySelectorAll('[data-remote-command]').forEach(button => button.addEventListener('click', () => send({ type: 'command', command: button.dataset.remoteCommand })));
  connect();
})();
</script>`;
}
