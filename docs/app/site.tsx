/** @jsxImportSource hono/jsx */
import type { LocaleLink } from "honoxpress";
import CopyCode from "./islands/copy-code";
import { ThemeSwitch } from "./components/theme-switch";
import docsSite from "./docs.config";
import { deployToCloudflareUrl } from "./deploy";
import { localizedHref, locales, t, type Locale } from "./i18n";

function DisclosureButton({
  controls,
  label,
  openLabel,
  className,
}: {
  controls: string;
  label: string;
  openLabel?: string;
  className: string;
}) {
  return (
    <button
      class={`disclosure-trigger ${className}`}
      type="button"
      aria-expanded="false"
      aria-controls={controls}
      data-disclosure-trigger
    >
      <span class="disclosure-label-closed">{label}</span>
      {openLabel ? <span class="disclosure-label-open">{openLabel}</span> : null}
      <svg class="disclosure-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>
  );
}

export function SiteHeader({
  activePath = "",
  locale,
  navigation = [],
  translations,
}: {
  activePath?: string;
  locale: Locale;
  navigation?: readonly { href: string; title: string }[];
  translations?: readonly LocaleLink[];
}) {
  const text = t(locale);
  return (
    <header class="site-header">
      <div class="header-inner">
        <a
          class="brand"
          href={localizedHref(docsSite.homeHref ?? "/", locale)}
          aria-label="hono decks documentation home"
        >
          <img class="brand-mark" src="/icon-192.png" width="32" height="32" alt="" aria-hidden="true" />
          <span>{docsSite.name}</span>
        </a>
        <nav class="top-nav" aria-label={text.primaryNavigation}>
          <a
            href={localizedHref(docsSite.docsHref ?? "/docs/getting-started", locale)}
            aria-current={activePath.startsWith("/docs") ? "page" : undefined}
          >
            {text.guides}
          </a>
          <a href={localizedHref("/api", locale)} aria-current={activePath === "/api" ? "page" : undefined}>
            {text.api}
          </a>
          <LanguageSwitcher locale={locale} path={activePath || "/"} translations={translations} />
          {docsSite.themeSwitch !== false && <ThemeSwitch locale={locale} />}
          <a href={docsSite.repositoryHref}>GitHub ↗</a>
        </nav>
        <div class="mobile-menu" data-disclosure>
          <DisclosureButton
            className="mobile-menu-trigger"
            controls="mobile-menu-panel"
            label={text.menu}
            openLabel={text.close}
          />
          <nav
            id="mobile-menu-panel"
            class="mobile-menu-panel"
            aria-label={text.mobileNavigation}
            data-disclosure-panel
            hidden
          >
            {navigation.map((item) => (
              <a href={item.href} aria-current={activePath === item.href.split("?")[0] ? "page" : undefined}>
                {item.title}
              </a>
            ))}
            <div class="mobile-language">
              {docsSite.themeSwitch !== false && <ThemeSwitch locale={locale} />}
              <LanguageSwitcher locale={locale} path={activePath || "/"} translations={translations} />
            </div>
            <a href={docsSite.repositoryHref}>GitHub ↗</a>
          </nav>
        </div>
      </div>
    </header>
  );
}

function LanguageSwitcher({
  locale,
  path,
  translations,
}: {
  locale: Locale;
  path: string;
  translations?: readonly LocaleLink[];
}) {
  const text = t(locale);
  return (
    <span class="language-switcher" aria-label={text.language} role="group">
      {locales.map((language, index) => {
        const href = translations
          ? translations.find((link) => link.locale === language)?.href
          : localizedHref(path, language);
        return (
          <>
            {index > 0 && <span aria-hidden="true">/</span>}
            {href ? (
              <a href={href} lang={language} aria-current={locale === language ? "true" : undefined}>
                {language.toUpperCase()}
              </a>
            ) : (
              <span lang={language} aria-disabled="true">
                {language.toUpperCase()}
              </span>
            )}
          </>
        );
      })}
    </span>
  );
}

export function RouteTable({ rows, locale = "ja" }: { rows: Array<[string, string]>; locale?: Locale }) {
  const text = t(locale);
  return (
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{text.route}</th>
            <th>{text.role}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([route, role]) => (
            <tr>
              <td>
                <code>{route}</code>
              </td>
              <td>{role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeployToCloudflare({ locale }: { locale: Locale }) {
  const href = deployToCloudflareUrl();
  const text = t(locale);
  const label = text.deployTitle;
  const note = href ? text.deployNote : text.deployUnavailable;
  return (
    <aside class="deploy-panel" aria-labelledby="deploy-title">
      <div>
        <p class="section-note">Cloudflare Workers</p>
        <h2 id="deploy-title">{label}</h2>
        <p>{note}</p>
      </div>
      {href ? (
        <a class="cloudflare-deploy" href={href} aria-label={label}>
          <img src="https://deploy.workers.cloudflare.com/button" alt={label} width="217" height="32" />
        </a>
      ) : (
        <span class="cloudflare-deploy is-disabled" aria-disabled="true">
          <img src="https://deploy.workers.cloudflare.com/button" alt={label} width="217" height="32" />
          <small>{text.deployComingSoon}</small>
        </span>
      )}
    </aside>
  );
}

/** Homepage adapter; guide code is highlighted at MDX compile time. */
export function CodeBlock({ code, label = "Terminal", locale }: { code: string; label?: string; locale: Locale }) {
  const text = t(locale);
  return (
    <CopyCode
      code={code}
      filename={label}
      language="bash"
      copyLabel={text.copy}
      copiedLabel={text.copied}
      errorLabel={text.copyFailed}
    />
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const text = t(locale);
  return (
    <footer class="site-footer">
      <p>
        <strong>{docsSite.name}</strong> — {text.footerLine}
      </p>
      <nav aria-label={text.footerNavigation}>
        <a href={localizedHref(docsSite.docsHref ?? "/docs/getting-started", locale)}>{text.documentation}</a>
        <a href={localizedHref("/api", locale)}>API</a>
        <a href={docsSite.repositoryHref}>GitHub</a>
      </nav>
    </footer>
  );
}
