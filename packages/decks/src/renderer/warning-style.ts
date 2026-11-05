/** Warning overlays stay outside the slide layout and remain scrollable on small screens. */
export function warningStyle(): string {
  return `.hono-decks-warnings{position:fixed;top:12px;right:12px;z-index:100;box-sizing:border-box;max-width:min(440px,calc(100vw - 24px));max-block-size:40vh;overflow:auto;overflow-wrap:anywhere;margin:0;padding:10px 12px;border-radius:8px;font-size:14px;line-height:1.45;box-shadow:0 2px 12px rgba(0,0,0,.18)}
.hono-decks-warnings p{margin:0}.hono-decks-warnings p+p{margin-top:.5em}
@media print{.hono-decks-warnings{position:static;max-width:none;max-block-size:none;overflow:visible;box-shadow:none}}`;
}
