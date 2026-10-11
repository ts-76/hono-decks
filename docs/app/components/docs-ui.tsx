import type { DocsPage, Heading, LocaleLink } from "honoxpress";

// Copy into app/components; the consumer owns and can edit these Hono JSX views.
export function DocsNavigation({
  pages,
  pathname,
  label = "Documentation",
}: {
  pages: readonly DocsPage[];
  pathname: string;
  label?: string;
}) {
  return (
    <nav class="docs-nav" aria-label={label}>
      <p class="nav-caption">{label}</p>
      <ul>
        {pages.map((page) => (
          <li>
            <a href={page.href} aria-current={page.href === pathname ? "page" : undefined}>
              {page.title}
            </a>
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
}: {
  links: readonly LocaleLink[];
  locale: string;
  labels: Readonly<Record<string, string>>;
  label?: string;
}) {
  return (
    <nav class="language-links" aria-label={label}>
      {links.map((link) =>
        link.href ? (
          <a
            href={link.href}
            lang={link.locale}
            hrefLang={link.locale}
            aria-current={link.locale === locale ? "page" : undefined}
          >
            {labels[link.locale] ?? link.locale}
          </a>
        ) : (
          <span lang={link.locale} aria-disabled="true" title="Translation unavailable">
            {labels[link.locale] ?? link.locale}
          </span>
        ),
      )}
    </nav>
  );
}
