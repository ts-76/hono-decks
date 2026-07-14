import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { getLocale, localizedHref, t } from "../i18n";
import { SiteHeader } from "../site";

export default jsxRenderer(({ children, title, description, activePath }, c) => {
  const locale = getLocale(c);
  const text = t(locale);
  return <html lang={locale}>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta
        name="description"
        content={description ?? (locale === "ja" ? "Hono application に MDX slide routes を組み込む hono-decks documentation" : "Documentation for mounting MDX slide routes in a Hono application")}
      />
      <meta name="theme-color" content="#161412" />
      <title>{title ? `${title} — hono-decks` : "hono-decks — slides in your Hono app"}</title>
      <Link href="/app/style.css" rel="stylesheet" />
      <Script src="/app/client.ts" async />
    </head>
    <body>
      <a class="skip-link" href="#main-content">
        {text.skip}
      </a>
      <SiteHeader activePath={activePath} locale={locale} />
      <div id="main-content">{children}</div>
      <footer class="site-footer">
        <p>
          <strong>hono-decks</strong> — {text.footerLine}
        </p>
        <nav aria-label={text.footerNavigation}>
          <a href={localizedHref("/docs/getting-started", locale)}>{text.documentation}</a>
          <a href={localizedHref("/api", locale)}>API</a>
          <a href="https://github.com/ts-76/hono-slides">GitHub</a>
        </nav>
      </footer>
    </body>
  </html>;
});
