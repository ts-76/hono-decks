import { jsxRenderer } from "hono/jsx-renderer";

export default jsxRenderer(({ children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HonoX + hono-decks</title>
      <style>{pageStyle}</style>
    </head>
    <body>{children}</body>
  </html>
));

const pageStyle = `
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f3f4f6; color: #111827; }
body { margin: 0; }
.page { width: min(720px, calc(100% - 32px)); margin: 0 auto; padding: 64px 0; }
.page-card { padding: 32px; border: 1px solid #d1d5db; border-radius: 16px; background: #fff; box-shadow: 0 20px 50px rgba(15, 23, 42, .08); }
.page-kicker { margin: 0 0 8px; color: #0369a1; font-size: .85rem; font-weight: 700; text-transform: uppercase; }
h1 { margin: 0 0 16px; }
p { line-height: 1.7; }
.page-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.page-actions a { padding: 10px 14px; border-radius: 10px; background: #0f172a; color: #fff; text-decoration: none; }
.page-actions a:focus-visible { outline: 3px solid #38bdf8; outline-offset: 3px; }
`;
