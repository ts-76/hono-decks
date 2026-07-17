import { jsxRenderer } from "hono/jsx-renderer";

export default jsxRenderer(({ children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="description" content="HonoXとhono-decksで作る、登壇資料をそのまま掲載できるポートフォリオ実装例" />
      <meta name="theme-color" content="#111216" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="ts-76 Talks — HonoX + hono-decks" />
      <meta property="og:description" content="HonoXのページと登壇資料を、ひとつのHonoアプリから公開する。" />
      <title>ts-76 Talks — HonoX + hono-decks</title>
      <style>{pageStyle}</style>
    </head>
    <body>
      <a class="skip-link" href="#main-content">本文へ移動</a>
      <header class="site-header">
        <a class="site-brand" href="/" aria-label="ts-76 Talks home">
          <span aria-hidden="true">H</span>
          <strong>ts-76 / Talks</strong>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#talks">Talks</a>
          <a href="/decks">Deck index</a>
          <a href="https://github.com/ts-76/hono-decks">GitHub ↗</a>
        </nav>
      </header>
      {children}
      <footer class="site-footer">
        <p>Built with HonoX and hono-decks.</p>
        <a href="https://github.com/ts-76/hono-decks">View source ↗</a>
      </footer>
    </body>
  </html>
));

const pageStyle = `
:root {
  color-scheme: light;
  --ink: #111216;
  --ink-soft: #4d4d50;
  --surface: #fafafa;
  --line: #d8d8d6;
  --accent: #f45b1f;
  --accent-soft: #ffe8dc;
  --content: 1180px;
  font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", ui-sans-serif, system-ui, sans-serif;
  background: var(--surface);
  color: var(--ink);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; overflow-x: clip; background: var(--surface); }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
.skip-link { position: fixed; z-index: 30; top: 10px; left: 10px; translate: 0 -160%; background: var(--ink); padding: 10px 14px; color: white; text-decoration: none; }
.skip-link:focus { translate: 0; }
.site-header { position: absolute; z-index: 10; top: 0; left: 50%; display: flex; width: min(var(--content), calc(100% - 48px)); min-height: 80px; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.18); color: white; translate: -50% 0; }
.site-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.site-brand span { display: grid; width: 34px; height: 34px; place-items: center; background: var(--accent); color: var(--ink); font-weight: 800; transform: rotate(-4deg); }
.site-brand strong { font-size: .95rem; letter-spacing: -.02em; }
.site-header nav { display: flex; align-items: center; gap: 28px; font-size: .84rem; font-weight: 650; }
.site-header nav a { padding: 28px 0; text-decoration: none; }
.site-header nav a:hover { color: #ff9b70; }
.portfolio-hero { min-height: 720px; display: grid; background: var(--ink); color: white; }
.portfolio-hero-inner { display: grid; width: min(var(--content), calc(100% - 48px)); grid-template-columns: minmax(0, 1fr) minmax(320px, .6fr); gap: clamp(48px, 8vw, 112px); align-items: end; margin: 0 auto; padding: 176px 0 92px; }
.portfolio-intro { margin: 0 0 22px; color: #ff9b70; font-size: .82rem; font-weight: 720; }
.portfolio-hero h1 { max-width: 10ch; margin: 0; font-size: clamp(3.6rem, 7.2vw, 6rem); letter-spacing: -.04em; line-height: .91; text-wrap: balance; }
.portfolio-lede { max-width: 38ch; margin: 0 0 10px; color: #d5d0cc; font-size: clamp(1.08rem, 1.8vw, 1.35rem); line-height: 1.65; text-wrap: pretty; }
.portfolio-facts { display: grid; grid-template-columns: repeat(2, 1fr); margin: 30px 0 0; border-top: 1px solid rgba(255,255,255,.2); }
.portfolio-facts div { padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,.2); }
.portfolio-facts dt { color: #9c9895; font-size: .72rem; }
.portfolio-facts dd { margin: 5px 0 0; font-size: .92rem; font-weight: 650; }
.talks { width: min(var(--content), calc(100% - 48px)); margin: 0 auto; padding: clamp(80px, 10vw, 144px) 0; }
.talks-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 42px; }
.talks-heading h2 { margin: 0; font-size: clamp(2.5rem, 5vw, 4.25rem); letter-spacing: -.04em; line-height: .96; }
.talks-heading p { max-width: 34ch; margin: 0; color: var(--ink-soft); line-height: 1.7; }
.talk-feature { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
.talk-preview { min-width: 0; padding: 28px 28px 28px 0; border-right: 1px solid var(--line); }
.talk-preview iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 10px; background: var(--ink); }
.talk-copy { display: flex; min-width: 0; flex-direction: column; padding: 28px 0 28px 34px; }
.talk-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; color: var(--ink-soft); font-size: .76rem; }
.talk-copy h3 { margin: auto 0 18px; font-size: clamp(2.2rem, 3.8vw, 3.7rem); letter-spacing: -.04em; line-height: .98; text-wrap: balance; }
.talk-description { margin: 0; color: var(--ink-soft); line-height: 1.75; text-wrap: pretty; }
.talk-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.talk-tags span { border: 1px solid var(--line); border-radius: 999px; padding: 7px 11px; font-size: .72rem; }
.talk-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.talk-actions a { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; border-radius: 999px; padding: 0 18px; font-size: .82rem; font-weight: 720; text-decoration: none; }
.talk-actions .primary { background: var(--accent); color: var(--ink); }
.talk-actions .secondary { border: 1px solid var(--ink); }
.talk-actions a:hover { translate: 0 -2px; }
.portfolio-note { display: grid; grid-template-columns: minmax(220px, .55fr) minmax(0, 1.45fr); gap: clamp(36px, 8vw, 100px); background: var(--accent); padding: clamp(68px, 8vw, 112px) max(24px, calc((100vw - var(--content)) / 2)); color: var(--ink); }
.portfolio-note h2 { margin: 0; font-size: clamp(2.2rem, 4.5vw, 4rem); letter-spacing: -.04em; line-height: .96; }
.portfolio-note p { max-width: 58ch; margin: 0; font-size: clamp(1.05rem, 1.8vw, 1.3rem); line-height: 1.75; }
.portfolio-note code { background: rgba(17,18,22,.12); border-radius: 6px; padding: .12em .34em; }
.site-footer { display: flex; width: min(var(--content), calc(100% - 48px)); min-height: 110px; align-items: center; justify-content: space-between; margin: 0 auto; color: var(--ink-soft); font-size: .8rem; }
.site-footer a { font-weight: 700; text-decoration: none; }
@media (max-width: 820px) {
  .site-header nav a:first-child { display: none; }
  .portfolio-hero-inner, .talk-feature, .portfolio-note { grid-template-columns: 1fr; }
  .portfolio-hero-inner { align-items: end; padding-top: 150px; }
  .talk-preview { padding-right: 0; border-right: 0; }
  .talk-copy { min-height: 380px; padding-left: 0; }
  .talks-heading { align-items: start; flex-direction: column; }
}
@media (max-width: 560px) {
  .site-header { width: min(100% - 32px, var(--content)); }
  .site-header nav { gap: 16px; }
  .site-header nav a:nth-child(2) { display: none; }
  .portfolio-hero-inner, .talks, .site-footer { width: min(100% - 32px, var(--content)); }
  .portfolio-hero h1 { font-size: clamp(3.2rem, 17vw, 4.8rem); }
  .portfolio-facts { grid-template-columns: 1fr; }
  .talk-preview { padding-top: 20px; }
  .talk-copy { min-height: 340px; }
  .site-footer { align-items: flex-start; flex-direction: column; justify-content: center; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .site-brand span { transform: none; }
  .talk-actions a { transition: none; }
  .talk-actions a:hover { translate: none; }
}
`;
