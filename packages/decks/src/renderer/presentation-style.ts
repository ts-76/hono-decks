export const PRESENTATION_DESIGN_WIDTH = 1920;
export const PRESENTATION_DESIGN_HEIGHT = 1080;

export function presentationDesignCssVariables(): string {
  return `--hono-decks-width:${PRESENTATION_DESIGN_WIDTH}px;--hono-decks-height:${PRESENTATION_DESIGN_HEIGHT}px`;
}

export function basePresentationStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:32px;${presentationDesignCssVariables()};--hono-decks-transition-duration:.24s;--hono-decks-transition-easing:ease;--hono-decks-color:#eef2ff;--hono-decks-muted-color:#cbd5e1;--hono-decks-accent-color:#8bd3ff;--hono-decks-border-color:rgba(148,163,184,.24);--hono-decks-inline-code-background:rgba(15,23,42,.72);--hono-decks-code-background:rgba(15,23,42,.78);--hono-decks-card-background:rgba(15,23,42,.78);--hono-decks-card-image-background:rgba(255,255,255,.08);--hono-decks-warning-background:rgba(255,193,7,.12);--hono-decks-warning-color:#ffe59b;color:var(--hono-decks-color)}
html,body{margin:0;width:100%;height:100%;overflow:hidden}
.hono-decks-stage{width:100vw;height:100vh;overflow:hidden;position:relative;display:grid;place-items:center}
.hono-decks-deck{display:grid;gap:1rem;width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;transform-origin:left top}
.slide{box-sizing:border-box;aspect-ratio:16/9;padding:clamp(1.2rem,3vw,3rem);overflow:hidden}
.hono-decks-slide-content{width:100%;height:100%}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.slide.layout-cover>.hono-decks-slide-content,.slide.layout-statement>.hono-decks-slide-content{display:flex;flex-direction:column;justify-content:center}
.slide code{font-family:"SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,Consolas,monospace;font-size:.9em;line-height:1.45}
.slide :not(pre)>code{border-radius:6px;background:var(--hono-decks-inline-code-background);padding:.12em .34em}
.slide pre{max-width:100%;overflow:auto;box-sizing:border-box;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-code-background);padding:1rem;tab-size:2;white-space:pre}
.slide pre code{display:block;min-width:max-content;background:transparent;padding:0}
.hono-decks-code-block{margin:1rem 0;max-width:100%}
.hono-decks-code-caption{display:inline-flex;margin:0 0 .4rem;border:1px solid var(--hono-decks-border-color);border-radius:6px;padding:.2rem .5rem;background:var(--hono-decks-inline-code-background);color:var(--hono-decks-muted-color);font-size:.82rem}
.hono-decks-embed-frame{margin:1rem 0;max-width:100%}
.hono-decks-embed-viewport{width:min(100%,72rem);overflow:hidden}
.hono-decks-embed-viewport iframe{display:block;width:100%;height:100%;border:0}
.hono-decks-embed-fallback{margin:.45rem 0 0;color:var(--hono-decks-muted-color);font-size:.84rem}
.hono-decks-embed-fallback a{color:inherit}
.hono-decks-social-embed{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-social-card{margin:0;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem}
.hono-decks-social-card p{margin:0 0 .75rem;line-height:1.55}
.hono-decks-social-card footer{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;color:var(--hono-decks-muted-color);font-size:.9rem}
.hono-decks-social-card a{color:inherit}
.hono-decks-tweet-embed{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-tweet-embed .twitter-tweet{margin:0;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem}
.hono-decks-tweet-embed .twitter-tweet a{color:inherit}
.hono-decks-link-card{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-link-card-anchor{display:grid;grid-template-columns:minmax(9rem,32%) minmax(0,1fr);gap:.75rem;align-items:stretch;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem;color:inherit;text-decoration:none}
.hono-decks-link-card-body{display:grid;gap:.35rem;min-width:0}
.hono-decks-link-card-image{width:100%;height:100%;max-height:10rem;aspect-ratio:16/9;object-fit:cover;border-radius:6px;background:var(--hono-decks-card-image-background)}
.hono-decks-link-card-site{color:var(--hono-decks-accent-color);font-size:.8rem;text-transform:uppercase}
.hono-decks-link-card-title{font-weight:700}
.hono-decks-link-card-description{color:var(--hono-decks-muted-color);line-height:1.45}
.hono-decks-link-card-label{color:var(--hono-decks-accent-color);font-size:.88rem}
@media (max-width: 640px){.hono-decks-link-card-anchor{grid-template-columns:1fr}.hono-decks-link-card-image{height:auto;max-height:12rem}}
.mdx-hero{height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,42%);gap:clamp(1rem,3vw,3rem);align-items:center}
.mdx-hero:not(.has-image){grid-template-columns:1fr}
.mdx-hero-copy{min-width:0}
.mdx-hero-eyebrow{margin:0 0 .75rem;color:var(--hono-decks-accent-color);text-transform:uppercase;font-size:.85rem;letter-spacing:0}
.mdx-hero h1{margin:0;font-size:clamp(2.2rem,5vw,5rem);line-height:1.02}
.mdx-hero-subtitle{margin:1rem 0 0;font-size:clamp(1rem,1.8vw,1.5rem);line-height:1.45;color:var(--hono-decks-muted-color)}
.mdx-hero-image{width:100%;height:auto;max-height:70vh;object-fit:contain;border-radius:8px}
[data-hono-decks-fragment]{transition:opacity .18s ease,transform .18s ease}
[data-hono-decks-fragment][data-fragment-hidden]{visibility:hidden;opacity:0;transform:translateY(.35rem)}
[data-fire-effect=none][data-fragment-hidden]{transform:none}
[data-fire-effect=fade][data-fragment-hidden]{transform:none}
[data-fire-effect=fade-up][data-fragment-hidden]{transform:translateY(.85rem)}
[data-fire-effect=scale][data-fragment-hidden]{transform:scale(.96)}
body:not([data-overview-mode]) .hono-decks-deck{position:relative}
body:not([data-overview-mode]) .slide{position:absolute;inset:0;width:100%;height:100%}
.slide[data-active-transition]{transition:opacity var(--hono-decks-active-transition-duration,var(--hono-decks-slide-transition-duration,var(--hono-decks-transition-duration))) var(--hono-decks-active-transition-easing,var(--hono-decks-slide-transition-easing,var(--hono-decks-transition-easing))),transform var(--hono-decks-active-transition-duration,var(--hono-decks-slide-transition-duration,var(--hono-decks-transition-duration))) var(--hono-decks-active-transition-easing,var(--hono-decks-slide-transition-easing,var(--hono-decks-transition-easing)));will-change:opacity,transform}
.slide[data-slide-state="inactive"]{visibility:hidden;pointer-events:none}
.slide[data-slide-state="active"]{visibility:visible;opacity:1;transform:translate3d(0,0,0) scale(1)}
.slide[data-active-transition="fade"][data-slide-state="entering"],.slide[data-active-transition="fade"][data-slide-state="leaving"],.slide[data-active-transition="view-transition"][data-slide-state="entering"],.slide[data-active-transition="view-transition"][data-slide-state="leaving"]{opacity:0}
.slide[data-active-transition="fade-out"][data-slide-state="entering"]{opacity:1}
.slide[data-active-transition="fade-out"][data-slide-state="leaving"]{opacity:0}
.slide[data-active-transition="slide-left"][data-slide-direction="forward"][data-slide-state="entering"],.slide[data-active-transition="slide-right"][data-slide-direction="backward"][data-slide-state="leaving"]{transform:translate3d(100%,0,0)}
.slide[data-active-transition="slide-left"][data-slide-direction="forward"][data-slide-state="leaving"],.slide[data-active-transition="slide-right"][data-slide-direction="backward"][data-slide-state="entering"]{transform:translate3d(-100%,0,0)}
.slide[data-active-transition="slide-left"][data-slide-direction="backward"][data-slide-state="entering"],.slide[data-active-transition="slide-right"][data-slide-direction="forward"][data-slide-state="leaving"]{transform:translate3d(-100%,0,0)}
.slide[data-active-transition="slide-left"][data-slide-direction="backward"][data-slide-state="leaving"],.slide[data-active-transition="slide-right"][data-slide-direction="forward"][data-slide-state="entering"]{transform:translate3d(100%,0,0)}
.slide[data-active-transition="slide-up"][data-slide-direction="forward"][data-slide-state="entering"],.slide[data-active-transition="slide-down"][data-slide-direction="backward"][data-slide-state="leaving"]{transform:translate3d(0,100%,0)}
.slide[data-active-transition="slide-up"][data-slide-direction="forward"][data-slide-state="leaving"],.slide[data-active-transition="slide-down"][data-slide-direction="backward"][data-slide-state="entering"]{transform:translate3d(0,-100%,0)}
.slide[data-active-transition="slide-up"][data-slide-direction="backward"][data-slide-state="entering"],.slide[data-active-transition="slide-down"][data-slide-direction="forward"][data-slide-state="leaving"]{transform:translate3d(0,-100%,0)}
.slide[data-active-transition="slide-up"][data-slide-direction="backward"][data-slide-state="leaving"],.slide[data-active-transition="slide-down"][data-slide-direction="forward"][data-slide-state="entering"]{transform:translate3d(0,100%,0)}
body:not([data-overview-mode]) .slide[hidden]{display:none}
body[data-overview-mode] .hono-decks-deck{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
body[data-overview-mode] .slide{cursor:pointer}
body[data-presenter-mode] .speaker-notes{display:block;margin-top:1rem;padding:.75rem;border-radius:8px;background:var(--hono-decks-card-image-background)}
.hono-decks-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:var(--hono-decks-warning-background);color:var(--hono-decks-warning-color)}
@media screen{html[data-hono-decks-print-preview]{width:auto;height:auto;min-height:100%;overflow:visible}
body[data-hono-decks-print-preview]{min-height:100vh;overflow:auto;color-scheme:light;color:#000;--hono-decks-print-gap:6mm;--hono-decks-print-slot-height:80mm;--hono-decks-print-scale:.28}
body[data-hono-decks-print-preview] .hono-decks-stage{display:block;width:auto;height:auto;min-height:100vh;overflow:visible;padding:12mm 0;box-sizing:border-box}
body[data-hono-decks-print-preview] .hono-decks-deck{display:grid;grid-template-columns:1fr;grid-auto-rows:var(--hono-decks-print-slot-height);gap:var(--hono-decks-print-gap);width:calc(var(--hono-decks-print-slot-height) * 16 / 9);max-width:calc(100vw - 24px);height:auto;margin:0 auto;transform:none!important}
body[data-hono-decks-print-preview] .slide{position:static;width:100%;max-width:100%;height:var(--hono-decks-print-slot-height);aspect-ratio:16/9;justify-self:center;align-self:center;padding:0;box-shadow:0 2px 10px rgba(15,23,42,.16);transition:none!important;transform:none!important}
body[data-hono-decks-print-preview] .hono-decks-slide-content{width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;padding:clamp(1.2rem,3vw,3rem);transform:scale(var(--hono-decks-print-scale));transform-origin:left top;overflow:hidden}
body[data-hono-decks-print-preview]:not([data-overview-mode]) .slide[hidden]{display:block!important}
body[data-hono-decks-print-preview] .slide[data-slide-state]{visibility:visible!important;opacity:1!important;transform:none!important}
body[data-hono-decks-print-preview] [data-hono-decks-fragment]{visibility:visible!important;opacity:1!important;transform:none!important}}
@page{size:A4 portrait;margin:12mm}
@media print{:root{color-scheme:light;color:#000;--hono-decks-print-gap:6mm;--hono-decks-print-slot-height:80mm;--hono-decks-print-scale:.28}html,body{width:auto;height:auto;overflow:visible}.hono-decks-stage{display:block;width:auto;height:auto;overflow:visible}.hono-decks-deck{display:grid;grid-template-columns:1fr;grid-auto-rows:var(--hono-decks-print-slot-height);gap:var(--hono-decks-print-gap);width:calc(var(--hono-decks-print-slot-height) * 16 / 9);height:auto;margin:0 auto;transform:none!important}.slide{position:static;width:100%;max-width:100%;height:var(--hono-decks-print-slot-height);aspect-ratio:16/9;justify-self:center;align-self:center;padding:0;page-break-after:auto;break-after:auto;break-inside:avoid;box-shadow:none;transition:none!important;transform:none!important}.hono-decks-slide-content{width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;padding:clamp(1.2rem,3vw,3rem);transform:scale(var(--hono-decks-print-scale));transform-origin:left top;overflow:hidden}.slide:nth-of-type(3n):not(:last-child){page-break-after:always;break-after:page}body:not([data-overview-mode]) .slide[hidden]{display:block!important}.slide[data-slide-state]{visibility:visible!important;opacity:1!important;transform:none!important}[data-hono-decks-fragment]{visibility:visible!important;opacity:1!important;transform:none!important}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.slide[data-active-transition]{transform:none!important}}`;
}
