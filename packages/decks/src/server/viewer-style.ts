import { layer } from "../renderer/style-layers";

export const VIEWER_ASPECT_RATIO = "16/9";

export function viewerViewportRule(): string {
  return `.hono-decks-viewport{width:min(100%,calc((100vh - 58px) * 16 / 9));aspect-ratio:${VIEWER_ASPECT_RATIO};position:relative;overflow:hidden;touch-action:pan-y}
@supports (height:100dvh){.hono-decks-viewport{width:min(100%,calc((100dvh - 58px) * 16 / 9))}}
@supports (width:1cqw){.hono-decks-viewport{width:min(100cqw,calc(100cqh * 16 / 9));height:min(100cqh,calc(100cqw * 9 / 16))}}`;
}

/** Layered stylesheet for the standalone viewer page. */
export function baseViewerStyle(): string {
  return [
    layer(
      "components",
      `
:root{color-scheme:dark;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hono-decks-control-icon{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;pointer-events:none}
*:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.hono-decks-viewer-header{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hono-decks-viewer-title{margin:0;font-size:1rem;line-height:1.25}
.hono-decks-viewer-meta{margin:.2rem 0 0;color:#cbd5e1;font-size:.82rem}
.hono-decks-viewport:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.hono-decks-mobile-navigation{position:absolute;top:25%;bottom:25%;display:none;width:clamp(2.25rem,6%,2.75rem);align-items:center;justify-content:center;z-index:2;margin:0;border:0;border-radius:8px;background:transparent;color:transparent;padding:0;appearance:none;pointer-events:none;touch-action:manipulation}
.hono-decks-mobile-navigation-previous{left:.25rem}
.hono-decks-mobile-navigation-next{right:.25rem}
.hono-decks-mobile-navigation:focus-visible{background:rgba(15,23,42,.28);color:#eef2ff;outline:2px solid currentColor;outline-offset:-4px}
.hono-decks-mobile-navigation:active{background:rgba(15,23,42,.28);color:#eef2ff}
.hono-decks-mobile-navigation .hono-decks-control-icon{width:22px;height:22px}
.hono-decks-viewport>[data-hono-decks-position]{position:absolute;left:0;right:0;bottom:0;z-index:3;height:4px;margin:0;padding:0;border:0;overflow:hidden;background:var(--hono-decks-viewer-progress-track,rgba(15,23,42,.22));pointer-events:none}
.hono-decks-progress-bar{display:block;width:100%;height:100%;background:var(--hono-decks-viewer-progress-color,#3b82f6);transform:scaleX(var(--hono-decks-progress,0));transform-origin:left center;transition:transform .32s cubic-bezier(.22,1,.36,1)}
.hono-decks-progress-text{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hono-decks-viewer-controls{position:absolute;left:50%;bottom:max(.25rem,env(safe-area-inset-bottom,0));display:flex;gap:8px;align-items:center;justify-content:center;max-width:calc(100% - 1rem);min-width:0;z-index:4;transform:translateX(-50%)}
.hono-decks-viewer-controls [data-hono-decks-navigation-control="previous"],.hono-decks-viewer-controls [data-hono-decks-navigation-control="next"],.hono-decks-viewer-controls [data-hono-decks-position]{position:absolute;visibility:hidden;pointer-events:none}
.hono-decks-viewer-controls button,.hono-decks-viewer-controls a,.hono-decks-viewer-controls span{border:1px solid rgba(148,163,184,.32);border-radius:8px;background:rgba(15,23,42,.78);color:inherit;padding:8px 10px;font:inherit;font-size:14px}
.hono-decks-viewer-controls span{flex:0 0 auto;white-space:nowrap}
.hono-decks-viewer-toc button,.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{font:inherit}
.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;box-sizing:border-box;text-decoration:none;cursor:pointer}
.hono-decks-viewer-controls button *,.hono-decks-viewer-controls a *{pointer-events:none;cursor:pointer}
@media (hover:hover){.hono-decks-mobile-navigation:hover{background:rgba(15,23,42,.28);color:#eef2ff}}
@media (max-width:480px){.hono-decks-viewer-controls{gap:4px}.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{width:36px;height:36px}.hono-decks-viewer-controls button,.hono-decks-viewer-controls a,.hono-decks-viewer-controls span{padding:7px 8px}}
@media (pointer:coarse){.hono-decks-mobile-navigation{display:inline-flex;pointer-events:auto}.hono-decks-viewer-controls [data-hono-decks-navigation-control="fullscreen"],.hono-decks-viewer-controls [data-hono-decks-print]{display:none}}
@media (orientation:landscape) and (max-height:600px){.hono-decks-viewer-controls{left:auto;right:max(.5rem,env(safe-area-inset-right,0));top:50%;bottom:auto;flex-direction:column;transform:translateY(-50%)}}`,
    ),
    layer(
      "runtime",
      `
html,body{margin:0;width:100%;height:100%;min-height:100vh}
@supports (height:100dvh){html,body{height:100dvh;min-height:100dvh}}
body{overflow:hidden}
[data-hono-decks-viewer]{width:100%;height:100vh;min-height:0;display:grid;place-items:center;box-sizing:border-box;overflow:hidden}
@supports (height:100dvh){[data-hono-decks-viewer]{height:100dvh}}
.hono-decks-viewer-shell{position:relative;display:grid;grid-template-rows:minmax(0,1fr);place-items:center;width:100%;height:100%;min-width:0;min-height:0;box-sizing:border-box;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)}
.hono-decks-viewer-stage{display:grid;place-items:center;justify-content:center;width:100%;height:100%;min-width:0;min-height:0;container-type:size}
${viewerViewportRule()}
.hono-decks-frame-stage{width:100%;height:100%}
.hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block}
@media (orientation:landscape) and (max-height:600px){.hono-decks-viewport{width:min(100%,calc(100dvh * 16 / 9))}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}`,
    ),
  ].join("\n");
}

/**
 * Layered stylesheet for viewers embedded in another document. Chrome sits in the
 * components layer, so the host page's own CSS can restyle it.
 */
export function embeddedViewerStyle(): string {
  const root = "[data-hono-decks-viewer][data-hono-decks-embed]";
  return [
    layer(
      "components",
      `
${root}{color-scheme:dark;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;gap:12px}
${root} .hono-decks-control-icon{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;pointer-events:none}
${root} *:focus-visible{outline:2px solid currentColor;outline-offset:2px}
${root} .hono-decks-viewport:focus-visible{outline:2px solid currentColor;outline-offset:4px}
${root} .hono-decks-mobile-navigation{position:absolute;top:25%;bottom:25%;display:none;width:clamp(2.25rem,6%,2.75rem);align-items:center;justify-content:center;z-index:2;margin:0;border:0;border-radius:8px;background:transparent;color:transparent;padding:0;appearance:none;pointer-events:none;touch-action:manipulation}
${root} .hono-decks-mobile-navigation-previous{left:.25rem}
${root} .hono-decks-mobile-navigation-next{right:.25rem}
${root} .hono-decks-mobile-navigation:focus-visible{background:rgba(15,23,42,.28);color:#eef2ff;outline:2px solid currentColor;outline-offset:-4px}
${root} .hono-decks-mobile-navigation:active{background:rgba(15,23,42,.28);color:#eef2ff}
${root} .hono-decks-mobile-navigation .hono-decks-control-icon{width:22px;height:22px}
${root} .hono-decks-viewport>[data-hono-decks-position]{position:absolute;left:0;right:0;bottom:0;z-index:3;height:4px;margin:0;padding:0;border:0;overflow:hidden;background:var(--hono-decks-viewer-progress-track,rgba(15,23,42,.22));pointer-events:none}
${root} .hono-decks-progress-bar{display:block;width:100%;height:100%;background:var(--hono-decks-viewer-progress-color,#3b82f6);transform:scaleX(var(--hono-decks-progress,0));transform-origin:left center;transition:transform .32s cubic-bezier(.22,1,.36,1)}
${root} .hono-decks-progress-text{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
${root} .hono-decks-viewer-controls{position:absolute;left:50%;bottom:max(.25rem,env(safe-area-inset-bottom,0));display:flex;gap:8px;align-items:center;justify-content:center;max-width:calc(100% - 1rem);min-width:0;z-index:4;transform:translateX(-50%)}
${root} .hono-decks-viewer-controls [data-hono-decks-navigation-control="previous"],${root} .hono-decks-viewer-controls [data-hono-decks-navigation-control="next"],${root} .hono-decks-viewer-controls [data-hono-decks-position]{position:absolute;visibility:hidden;pointer-events:none}
${root} .hono-decks-viewer-controls button,${root} .hono-decks-viewer-controls a,${root} .hono-decks-viewer-controls span{border:1px solid rgba(148,163,184,.32);border-radius:8px;background:rgba(15,23,42,.78);color:inherit;padding:8px 10px;font:inherit;font-size:14px}
${root} .hono-decks-viewer-controls button,${root} .hono-decks-viewer-controls a{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;box-sizing:border-box;text-decoration:none;cursor:pointer}
${root} .hono-decks-viewer-controls button *,${root} .hono-decks-viewer-controls a *{pointer-events:none;cursor:pointer}
${root} .hono-decks-viewer-toc button{font:inherit}
@media (hover:hover){${root} .hono-decks-mobile-navigation:hover{background:rgba(15,23,42,.28);color:#eef2ff}}
@media (pointer:coarse){${root} .hono-decks-mobile-navigation{display:inline-flex;pointer-events:auto}}`,
    ),
    layer(
      "runtime",
      `
${root}{display:grid;width:100%;min-width:0;box-sizing:border-box}
${root} .hono-decks-viewer-shell{position:relative;display:grid;grid-template-rows:minmax(0,1fr);place-items:center;width:100%;min-width:0;min-height:0;box-sizing:border-box}
${root} .hono-decks-viewer-stage{display:grid;place-items:center;width:100%;min-width:0;min-height:0;container-type:inline-size}
${root} .hono-decks-viewport{width:100%;aspect-ratio:${VIEWER_ASPECT_RATIO};position:relative;overflow:hidden;touch-action:pan-y}
${root} .hono-decks-frame-stage,${root} .hono-decks-frame-stage iframe{width:100%;height:100%}
${root} .hono-decks-frame-stage iframe{border:0;display:block}
@media (prefers-reduced-motion: reduce){${root},${root} *{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}`,
    ),
  ].join("\n");
}
