import type { Child } from "hono/jsx";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import jsonc from "shiki/langs/jsonc.mjs";
import mdx from "shiki/langs/mdx.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import githubDarkHighContrast from "shiki/themes/github-dark-high-contrast.mjs";
import { deployToCloudflareUrl } from "./deploy";
import { localizedHref, t, type Locale } from "./i18n";

const navigationByLocale = {
  ja: [
    { href: "/docs/getting-started", label: "導入", detail: "インストールから表示確認まで" },
    { href: "/docs/authoring", label: "スライドを書く", detail: "MDX / コンポーネント / 画像 / テーマ" },
    { href: "/docs/configuration", label: "設定", detail: "設定ファイル / 開発 / 上書き" },
    { href: "/docs/recipes", label: "レシピ", detail: "OGP画像 / PDF・PNG出力" },
    { href: "/docs/routing", label: "ルートと画面", detail: "閲覧 / 発表 / 印刷" },
    { href: "/docs/security", label: "HTMLとセキュリティ", detail: "言語 / CSP / 埋め込み" },
    { href: "/api", label: "API", detail: "エントリー / 用途 / 型" },
  ],
  en: [
    { href: "/docs/getting-started", label: "Get started", detail: "render the first deck" },
    { href: "/docs/authoring", label: "Author slides", detail: "MDX / components / assets / theme" },
    { href: "/docs/configuration", label: "Configure", detail: "config file / development / overrides" },
    { href: "/docs/recipes", label: "Recipes", detail: "OGP images / PDF and PNG export" },
    { href: "/docs/routing", label: "Choose surfaces", detail: "viewer / presenter / print" },
    { href: "/docs/security", label: "Publish safely", detail: "language / CSP / embeds" },
    { href: "/api", label: "API", detail: "entries / use cases / types" },
  ],
} as const;

export interface PageSection {
  id: string;
  label: string;
}

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

function navigation(locale: Locale) {
  return navigationByLocale[locale];
}

export function SiteHeader({ activePath = "", locale }: { activePath?: string; locale: Locale }) {
  const text = t(locale);
  return (
    <header class="site-header">
      <a class="brand" href={localizedHref("/", locale)} aria-label="hono decks documentation home">
        <span class="brand-mark" aria-hidden="true">h</span>
        <span>hono<span class="brand-slash">-</span>decks</span>
      </a>
      <nav class="top-nav" aria-label={text.primaryNavigation}>
        <a href={localizedHref("/docs/getting-started", locale)} aria-current={activePath.startsWith("/docs") ? "page" : undefined}>
          {text.guides}
        </a>
        <a href={localizedHref("/api", locale)} aria-current={activePath === "/api" ? "page" : undefined}>{text.api}</a>
        <LanguageSwitcher locale={locale} path={activePath || "/"} />
        <a href="https://github.com/ts-76/hono-slides">GitHub ↗</a>
      </nav>
      <div class="mobile-menu" data-disclosure>
        <DisclosureButton
          className="mobile-menu-trigger"
          controls="mobile-menu-panel"
          label={text.menu}
          openLabel={text.close}
        />
        <nav id="mobile-menu-panel" class="mobile-menu-panel" aria-label={text.mobileNavigation} data-disclosure-panel hidden>
          {navigation(locale).map((item) => (
            <a href={localizedHref(item.href, locale)} aria-current={activePath === item.href || (item.href.startsWith("/docs") && activePath === item.href) ? "page" : undefined}>
              {item.label}
            </a>
          ))}
          <div class="mobile-language"><LanguageSwitcher locale={locale} path={activePath || "/"} /></div>
          <a href="https://github.com/ts-76/hono-slides">GitHub ↗</a>
        </nav>
      </div>
    </header>
  );
}

function LanguageSwitcher({ locale, path }: { locale: Locale; path: string }) {
  const text = t(locale);
  return (
    <span class="language-switcher" aria-label={text.language} role="group">
      <a href={localizedHref(path, "ja")} lang="ja" aria-current={locale === "ja" ? "true" : undefined}>JA</a>
      <span aria-hidden="true">/</span>
      <a href={localizedHref(path, "en")} lang="en" aria-current={locale === "en" ? "true" : undefined}>EN</a>
    </span>
  );
}

export function DocsLayout({
  activePath,
  title,
  description,
  sections,
  locale,
  children,
}: {
  activePath: string;
  title: string;
  description: string;
  sections: PageSection[];
  locale: Locale;
  children: Child;
}) {
  const text = t(locale);
  const links = navigation(locale);
  return (
    <main class="docs-layout">
      <aside class="docs-sidebar" aria-label={text.documentationSections}>
        <p class="sidebar-label">{text.documentation}</p>
        <div class="docs-switcher" data-disclosure>
          <DisclosureButton className="docs-switcher-trigger" controls="docs-switcher-panel" label={text.selectGuide} />
          <nav id="docs-switcher-panel" data-disclosure-panel hidden>
            {links.map((item) => (
              <a href={localizedHref(item.href, locale)} aria-current={activePath === item.href ? "page" : undefined}>
                <span>{item.label}</span><small>{item.detail}</small>
              </a>
            ))}
          </nav>
        </div>
        <nav class="docs-navigation">
          {links.map((item) => (
            <a href={localizedHref(item.href, locale)} aria-current={activePath === item.href ? "page" : undefined}>
              <span>{item.label}</span><small>{item.detail}</small>
            </a>
          ))}
        </nav>
      </aside>
      <article class="docs-article">
        <header class="docs-heading">
          <p class="path-label">{activePath}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div class="mobile-page-nav" data-disclosure>
          <DisclosureButton className="mobile-page-nav-trigger" controls="mobile-page-nav-panel" label={text.onThisPage} />
          <nav id="mobile-page-nav-panel" data-disclosure-panel hidden>
            {sections.map((section) => <a href={`#${section.id}`}>{section.label}</a>)}
          </nav>
        </div>
        <div class="prose">{children}</div>
      </article>
      <aside class="docs-rail" aria-label={text.onThisPage}>
        <p>{text.onThisPage}</p>
        {sections.map((section) => <a href={`#${section.id}`}>{section.label}</a>)}
      </aside>
    </main>
  );
}

function codeId(code: string) {
  let hash = 0;
  for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `code-${hash.toString(36)}`;
}

type DocsCodeLanguage = "bash" | "css" | "jsonc" | "mdx" | "text" | "tsx" | "typescript";

const codeTheme = "github-dark-high-contrast";
const codeHighlighter = createHighlighterCoreSync({
  themes: [githubDarkHighContrast],
  langs: [bash, css, jsonc, mdx, tsx, typescript],
  engine: createJavaScriptRegexEngine(),
});

function codeLanguage(label: string, lang?: DocsCodeLanguage): DocsCodeLanguage {
  if (lang) return lang;
  const normalized = label.toLowerCase();
  if (normalized === "terminal") return "bash";
  if (normalized === "mdx" || normalized.endsWith(".mdx")) return "mdx";
  if (normalized.endsWith(".tsx")) return "tsx";
  if (normalized.endsWith(".css")) return "css";
  if (normalized.endsWith(".json") || normalized.endsWith(".jsonc")) return "jsonc";
  if (normalized === "generated files") return "text";
  return "typescript";
}

function tokenStyle(color: string | undefined, fontStyle: number | undefined): string {
  const styles = color ? [`color:${color}`] : [];
  if ((fontStyle ?? 0) & 1) styles.push("font-style:italic");
  if ((fontStyle ?? 0) & 2) styles.push("font-weight:700");
  if ((fontStyle ?? 0) & 4) styles.push("text-decoration:underline");
  return styles.join(";");
}

export function CodeBlock({
  code,
  label = "TypeScript",
  lang,
  locale = "ja",
  copy = true,
}: {
  code: string;
  label?: string;
  lang?: DocsCodeLanguage;
  locale?: Locale;
  copy?: boolean;
}) {
  const text = t(locale);
  const id = codeId(code);
  const language = codeLanguage(label, lang);
  const highlighted = codeHighlighter.codeToTokens(code, { lang: language, theme: codeTheme });
  return (
    <figure class="code-block">
      <figcaption>
        <span>{label}</span>
        {copy ? (
          <button class="copy-button" type="button" data-copy={id} aria-label={`${text.copy}: ${label}`}>
            <span aria-hidden="true">⧉</span>
            <span data-copy-status data-idle={text.copy} data-success={text.copied} data-error={text.copyFailed} aria-live="polite">{text.copy}</span>
          </button>
        ) : null}
      </figcaption>
      <pre><code id={id} class={`language-${language}`} data-language={language} data-source={code}>{highlighted.tokens.map((line, lineIndex) => <>{line.map((token) => {
        const style = tokenStyle(token.color, token.fontStyle);
        return <span style={style || undefined}>{token.content}</span>;
      })}{lineIndex < highlighted.tokens.length - 1 ? "\n" : null}</>)}</code></pre>
    </figure>
  );
}

export function Callout({ title, children }: { title: string; children: Child }) {
  return <aside class="callout"><strong>{title}</strong><div>{children}</div></aside>;
}

export function RouteTable({ rows, locale = "ja" }: { rows: Array<[string, string]>; locale?: Locale }) {
  const text = t(locale);
  return (
    <div class="table-wrap">
      <table>
        <thead><tr><th>{text.route}</th><th>{text.role}</th></tr></thead>
        <tbody>{rows.map(([route, role]) => <tr><td><code>{route}</code></td><td>{role}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function DeployToCloudflare({ locale }: { locale: Locale }) {
  const href = deployToCloudflareUrl();
  const label = locale === "ja" ? "Deploy to Cloudflare" : "Deploy to Cloudflare";
  const note = href
    ? locale === "ja"
      ? "最小構成のサンプルをCloudflareアカウントに複製し、Workerとしてデプロイします。"
      : "Clone the minimal example into your Cloudflare account and deploy it as a Worker."
    : locale === "ja"
      ? "公開サンプルリポジトリを準備中です。"
      : "The public sample repository is coming soon.";
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
          <small>{locale === "ja" ? "サンプル準備中" : "Sample coming soon"}</small>
        </span>
      )}
    </aside>
  );
}
