export const VIEWER_ASPECT_RATIO = "16/9";

export function viewerViewportRule(): string {
  return `.hono-decks-viewport{width:min(100%,calc((100vh - 58px) * 16 / 9));aspect-ratio:${VIEWER_ASPECT_RATIO};position:relative;overflow:hidden;touch-action:pan-y}
@supports (height:100dvh){.hono-decks-viewport{width:min(100%,calc((100dvh - 58px) * 16 / 9))}}
@supports (width:1cqw){.hono-decks-viewport{width:min(100cqw,calc(100cqh * 16 / 9));height:min(100cqh,calc(100cqw * 9 / 16))}}`;
}

export function baseViewerStyle(): string {
  return `
:root{color-scheme:dark;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
html,body{margin:0;width:100%;height:100%;min-height:100vh}
@supports (height:100dvh){html,body{height:100dvh;min-height:100dvh}}
body{overflow:hidden}
[data-hono-decks-viewer]{width:100%;height:100vh;min-height:0;display:grid;place-items:center;box-sizing:border-box;overflow:hidden}
@supports (height:100dvh){[data-hono-decks-viewer]{height:100dvh}}
.hono-decks-viewer-header{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hono-decks-viewer-title{margin:0;font-size:1rem;line-height:1.25}
.hono-decks-viewer-meta{margin:.2rem 0 0;color:#cbd5e1;font-size:.82rem}
.hono-decks-viewer-shell{display:grid;grid-template-rows:minmax(0,1fr) auto;place-items:center;gap:12px;width:100%;height:100%;min-width:0;min-height:0;box-sizing:border-box;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)}
.hono-decks-viewer-stage{display:grid;place-items:center;justify-content:center;width:100%;height:100%;min-width:0;min-height:0;container-type:size}
${viewerViewportRule()}
.hono-decks-viewport:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.hono-decks-frame-stage{width:100%;height:100%}
.hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block}
.hono-decks-viewer-navigation-layer{position:absolute;top:0;bottom:0;width:50%;z-index:2;margin:0;border:0;padding:0;appearance:none;background:transparent;color:transparent;cursor:pointer;touch-action:pan-y}
.hono-decks-viewer-navigation-previous{left:0}
.hono-decks-viewer-navigation-next{right:0}
.hono-decks-viewport>[data-hono-decks-position]{position:absolute;left:50%;bottom:max(8px,env(safe-area-inset-bottom,0));z-index:3;transform:translateX(-50%);border:0;background:transparent;color:inherit;padding:0;font:inherit;font-size:12px;line-height:1;opacity:.38;pointer-events:none;white-space:nowrap}
.hono-decks-viewer-controls{display:flex;gap:8px;align-items:center;justify-content:center;max-width:100%;min-width:0;z-index:1}
.hono-decks-viewer-controls [data-hono-decks-navigation-control="previous"],.hono-decks-viewer-controls [data-hono-decks-navigation-control="next"],.hono-decks-viewer-controls [data-hono-decks-position]{position:absolute;visibility:hidden;pointer-events:none}
.hono-decks-viewer-controls button,.hono-decks-viewer-controls a,.hono-decks-viewer-controls span{border:1px solid rgba(148,163,184,.32);border-radius:8px;background:rgba(15,23,42,.78);color:inherit;padding:8px 10px;font:inherit;font-size:14px}
.hono-decks-viewer-controls span{flex:0 0 auto;white-space:nowrap}
.hono-decks-viewer-toc button,.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{font:inherit}
.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;box-sizing:border-box;text-decoration:none;cursor:pointer}
.hono-decks-viewer-controls button *,.hono-decks-viewer-controls a *{pointer-events:none;cursor:pointer}
.hono-decks-control-icon{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;pointer-events:none}
@media (max-width:480px){.hono-decks-viewer-controls{gap:4px}.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{width:36px;height:36px}.hono-decks-viewer-controls button,.hono-decks-viewer-controls a,.hono-decks-viewer-controls span{padding:7px 8px}}
@media (pointer:coarse){.hono-decks-viewer-controls [data-hono-decks-navigation-control="fullscreen"],.hono-decks-viewer-controls [data-hono-decks-print]{display:none}}
@media (orientation:landscape) and (max-height:600px){.hono-decks-viewer-shell{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr)}.hono-decks-viewer-controls{flex-direction:column}.hono-decks-viewport{width:min(100%,calc(100dvh * 16 / 9))}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}`;
}
