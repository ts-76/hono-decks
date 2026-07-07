export const VIEWER_ASPECT_RATIO = "16/9";

export function viewerViewportRule(): string {
  return `.hono-decks-viewport{width:min(100vw,calc(100vh * 16 / 9));aspect-ratio:${VIEWER_ASPECT_RATIO};position:relative;overflow:hidden;touch-action:pan-y}`;
}

export function baseViewerStyle(): string {
  return `
:root{color-scheme:dark;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
html,body{margin:0;min-height:100vh}
body{overflow:hidden}
[data-hono-decks-viewer]{min-height:100vh;display:grid;place-items:center;box-sizing:border-box}
.hono-decks-viewer-header{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hono-decks-viewer-title{margin:0;font-size:1rem;line-height:1.25}
.hono-decks-viewer-meta{margin:.2rem 0 0;color:#cbd5e1;font-size:.82rem}
.hono-decks-viewer-shell{display:grid;place-items:center;gap:12px;min-width:0;min-height:0}
.hono-decks-viewer-stage{display:grid;place-items:center;min-width:0;min-height:0}
${viewerViewportRule()}
.hono-decks-viewport:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.hono-decks-frame-stage{width:100%;height:100%}
.hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block}
.hono-decks-viewer-controls{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;align-items:center}
.hono-decks-viewer-toc button,.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{font:inherit}
.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;box-sizing:border-box;cursor:pointer}
.hono-decks-viewer-controls button *,.hono-decks-viewer-controls a *{pointer-events:none;cursor:pointer}
.hono-decks-control-icon{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;pointer-events:none}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}`;
}
