import type { Child } from "hono/jsx";
import type { DocsPage, LocaleLink, DocsSiteConfig } from "honoxpress";
import { Link } from "honox/server";
import { SiteHeader, SiteFooter, DisclosureButton } from "../site";
import { ThemeScript } from "./theme-switch";
import { DocsNavigation, TableOfContents } from "./docs-ui";
import type { Locale } from "../i18n";

/** Consumer-owned honoxpress shell, integrated with the application's existing header and URLs. */
export function DocsLayout({
  children,
  current,
  pages,
  translations,
  locale,
  clientSrc,
  config,
}: {
  children: Child;
  current: DocsPage;
  pages: readonly DocsPage[];
  translations: readonly LocaleLink[];
  locale: Locale;
  clientSrc?: string;
  config: DocsSiteConfig;
}) {
  const labels = config.labels?.[locale];
  const navLabel = labels?.nav ?? "Documentation";
  const tocLabel = labels?.toc ?? "On this page";
  const path = current.href.split("?")[0];
  return (
    <html lang={locale}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>
          {current.title} — {config.name}
        </title>
        <meta name="description" content={current.description} />
        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/favicon-32.png" rel="icon" type="image/png" sizes="32x32" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        <link href="/site.webmanifest" rel="manifest" />
        {config.themeSwitch !== false && <ThemeScript />}
        <Link rel="stylesheet" href={config.stylesheetHref ?? "/app/style.css"} />
        {clientSrc && <script type="module" src={clientSrc} />}
      </head>
      <body class="docs-document">
        <a class="skip-link" href="#main-content">
          {labels?.skip ?? "Skip to content"}
        </a>
        <SiteHeader locale={locale} activePath={path} navigation={pages} translations={translations} />
        <div class="docs-layout">
          <aside class="docs-sidebar">
            <DocsNavigation pages={pages} pathname={current.href} label={navLabel} />
          </aside>
          <main id="main-content" class="docs-main" tabIndex={-1}>
            <nav class="breadcrumbs" aria-label={navLabel}>
              <a href={config.homeHref ?? "/"}>{navLabel}</a>
              <span aria-hidden="true">/</span>
              <span>{current.title}</span>
            </nav>
            <div class="mobile-page-nav" data-disclosure>
              <DisclosureButton className="mobile-page-nav-trigger" controls="mobile-page-nav-panel" label={tocLabel} />
              <nav id="mobile-page-nav-panel" data-disclosure-panel hidden>
                <TableOfContents headings={current.headings} label={tocLabel} />
              </nav>
            </div>
            <article class="prose">{children}</article>
            <footer class="page-footer">{config.footer && <p>{config.footer}</p>}</footer>
          </main>
          <aside class="toc-rail">
            <TableOfContents headings={current.headings} label={tocLabel} />
          </aside>
        </div>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
