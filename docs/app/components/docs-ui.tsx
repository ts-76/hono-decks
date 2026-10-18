import type { DocsPage, Heading, LocaleLink } from "honoxpress";
import type { Child, FC } from "hono/jsx";

export interface DocsLinkProps {
  href: string;
  children?: Child;
  class?: string;
  lang?: string;
  hrefLang?: string;
  "aria-current"?: "page";
}
export type DocsLinkComponent = FC<DocsLinkProps>;
export const NativeDocsLink: DocsLinkComponent = (props) => <a {...props} />;

// Copy into app/components; the consumer owns and can edit these Hono JSX views.
export function DocsNavigation({
  pages,
  pathname,
  label = "Documentation",
  link: Link = NativeDocsLink,
}: {
  pages: readonly DocsPage[];
  pathname: string;
  label?: string;
  link?: DocsLinkComponent;
}) {
  return (
    <nav class="docs-nav" aria-label={label}>
      <p class="nav-caption">{label}</p>
      <ul>
        {pages.map((page) => (
          <li>
            <Link href={page.href} aria-current={page.href === pathname ? "page" : undefined}>
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
export function TableOfContents({
  headings,
  label = "On this page",
}: {
  headings: readonly Heading[];
  label?: string;
}) {
  const visible = headings.filter((heading) => heading.depth > 1);
  if (!visible.length) return null;
  return (
    <nav class="docs-toc" aria-label={label}>
      <p class="nav-caption">{label}</p>
      <ul>
        {visible.map((heading) => (
          <li class={heading.depth > 2 ? "toc-nested" : undefined}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
export function LanguageLinks({
  links,
  locale,
  labels,
  label = "Languages",
  link: Link = NativeDocsLink,
}: {
  links: readonly LocaleLink[];
  locale: string;
  labels: Readonly<Record<string, string>>;
  label?: string;
  link?: DocsLinkComponent;
}) {
  return (
    <nav class="language-links" aria-label={label}>
      {links.map((link) =>
        link.href ? (
          <Link
            href={link.href}
            lang={link.locale}
            hrefLang={link.locale}
            aria-current={link.locale === locale ? "page" : undefined}
          >
            {labels[link.locale] ?? link.locale}
          </Link>
        ) : (
          <span lang={link.locale} aria-disabled="true" title="Translation unavailable">
            {labels[link.locale] ?? link.locale}
          </span>
        ),
      )}
    </nav>
  );
}
