import { jsxRenderer } from "hono/jsx-renderer";
import { Link } from "honox/server";
import { SiteHeader } from "../site";

export default jsxRenderer(({ children, title, description, activePath }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta
        name="description"
        content={description ?? "Hono application に MDX slide routes を組み込む @hono/decks documentation"}
      />
      <meta name="theme-color" content="#161412" />
      <title>{title ? `${title} — hono/decks` : "hono/decks — slides in your Hono app"}</title>
      <Link href="/app/style.css" rel="stylesheet" />
    </head>
    <body>
      <a class="skip-link" href="#main-content">
        本文へ移動
      </a>
      <SiteHeader activePath={activePath} />
      <div id="main-content">{children}</div>
      <footer class="site-footer">
        <p>
          <strong>hono/decks</strong> — build-time MDX, runtime Hono routes.
        </p>
        <nav aria-label="Footer navigation">
          <a href="/docs/getting-started">Documentation</a>
          <a href="/api">API</a>
          <a href="https://github.com/ts-76/hono-slides">GitHub</a>
        </nav>
      </footer>
    </body>
  </html>
));
