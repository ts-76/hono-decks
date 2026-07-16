import { jsxRenderer } from "hono/jsx-renderer";
import { Link } from "honox/server";
import { getLocale, localizedHref, t } from "../i18n";
import { SiteHeader } from "../site";

interface ViteManifestEntry {
  file: string;
}

interface ViteManifestModule {
  default?: Record<string, ViteManifestEntry>;
}

const manifests = import.meta.glob<ViteManifestModule>("/dist/.vite/manifest.json", { eager: true });

export function clientEntrySource(prod = import.meta.env.PROD): string | undefined {
  if (!prod) return "/app/client.ts";
  for (const manifestModule of Object.values(manifests)) {
    const file = manifestModule.default?.["app/client.ts"]?.file;
    if (file) return `/${file.replace(/^\/+/, "")}`;
  }
}

export default jsxRenderer(({ children, title, description, activePath }, c) => {
  const locale = getLocale(c);
  const text = t(locale);
  const clientSrc = clientEntrySource();
  return <html lang={locale}>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta
        name="description"
        content={description ?? (locale === "ja" ? "MDXスライドをHonoのルートとして配信するためのhono-decksドキュメント" : "Documentation for mounting MDX slide routes in a Hono application")}
      />
      <meta name="theme-color" content="#161412" />
      <link href="/favicon.ico" rel="icon" sizes="any" />
      <link href="/favicon-32.png" rel="icon" type="image/png" sizes="32x32" />
      <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
      <link href="/site.webmanifest" rel="manifest" />
      <title>{title ? `${title} — hono-decks` : "hono-decks — slides in your Hono app"}</title>
      <Link href="/app/style.css" rel="stylesheet" />
      {clientSrc ? <script type="module" src={clientSrc}></script> : null}
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
          <a href="https://github.com/ts-76/hono-decks">GitHub</a>
        </nav>
      </footer>
    </body>
  </html>;
});
