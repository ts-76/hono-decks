import { jsxRenderer } from "hono/jsx-renderer";
import { Link } from "honox/server";
import { getLocale, t } from "../i18n";
import { SiteHeader, SiteFooter } from "../site";
import { DocsLayout } from "../components/docs-layout";
import { ThemeScript } from "../components/theme-switch";
import docsSite from "../docs.config";
import { docsCatalog, getDocument, publicDocsHref } from "../docs-catalog";

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
  const pages = docsCatalog.navigation(locale).map((page) => ({ ...page, href: publicDocsHref(page.href, locale) }));
  const slug = activePath === "/api" ? "api" : activePath?.startsWith("/docs/") ? activePath.slice(6) : undefined;
  const document = slug ? getDocument(slug, locale) : undefined;
  if (document) {
    const current = { ...document.page, href: publicDocsHref(document.page.href, locale) };
    const translations = docsCatalog
      .translations(document.page.href)
      .map((link) => ({
        ...link,
        href: link.href ? publicDocsHref(link.href, link.locale as typeof locale) : undefined,
      }));
    return (
      <DocsLayout
        config={docsSite}
        current={current}
        pages={pages}
        translations={translations}
        locale={locale}
        clientSrc={clientSrc}
      >
        {children}
      </DocsLayout>
    );
  }
  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="description"
          content={
            description ??
            (locale === "ja"
              ? "MDXスライドをHonoのルートとして配信するためのhono-decksドキュメント"
              : "Documentation for mounting MDX slide routes in a Hono application")
          }
        />
        <meta name="theme-color" content="#161412" />
        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/favicon-32.png" rel="icon" type="image/png" sizes="32x32" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        <link href="/site.webmanifest" rel="manifest" />
        <title>{title ? `${title} — ${docsSite.name}` : `${docsSite.name} — slides in your Hono app`}</title>
        {docsSite.themeSwitch !== false && <ThemeScript />}
        <Link href={docsSite.stylesheetHref ?? "/app/style.css"} rel="stylesheet" />
        {clientSrc ? <script type="module" src={clientSrc}></script> : null}
      </head>
      <body class="home-document">
        <a class="skip-link" href="#main-content">
          {text.skip}
        </a>
        <SiteHeader activePath={activePath} locale={locale} navigation={pages} />
        <div id="main-content">{children}</div>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
});
