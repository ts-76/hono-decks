import type { Heading } from "honoxpress";
import { docsCatalog } from "virtual:honoxpress/catalog";
export { docsCatalog };
import type { FC } from "hono/jsx";
import docsSite from "./docs.config";
import { localizedHref, type Locale } from "./i18n";

interface GuideModule {
  readonly default: FC;
  readonly frontmatter: { title: string; description: string; order: number };
  readonly toc: readonly Heading[];
}

// Vite compiles these MDX modules to Hono JSX. No compiler or filesystem is used by the Worker.
const modules = import.meta.glob<GuideModule>("./content/**/*.mdx", { eager: true });

/** Adapt catalog paths to the site's established query-based language URLs. */
export function publicDocsHref(href: string, locale: Locale): string {
  const prefix = `/${locale}/docs`;
  const path =
    locale !== docsSite.defaultLocale && href.startsWith(`${prefix}/`) ? href.slice(locale.length + 1) : href;
  return localizedHref(path === "/docs/api" ? "/api" : path, locale);
}

export function getDocument(slug: string, locale: Locale) {
  const route = `${locale === docsSite.defaultLocale ? "" : `${locale}/`}docs/${slug}.mdx`;
  const module = modules[`./content/${route}`];
  const page = docsCatalog.pages.find((entry) => entry.route === route);
  return module && page ? { Content: module.default, page } : undefined;
}
