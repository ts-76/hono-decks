import type { Child } from "hono/jsx";

export const docsNavigation = [
  { href: "/docs/getting-started", label: "はじめる", detail: "install / compile / mount" },
  { href: "/docs/authoring", label: "書く", detail: "MDX / components / assets" },
  { href: "/docs/routing", label: "組み込む", detail: "routes / viewer / presenter" },
  { href: "/docs/security", label: "守る", detail: "CSP / nonce / embed" },
  { href: "/api", label: "API", detail: "public exports" },
] as const;

export function SiteHeader({ activePath = "" }: { activePath?: string }) {
  return (
    <header class="site-header">
      <a class="brand" href="/" aria-label="hono decks documentation home">
        <span class="brand-mark" aria-hidden="true">
          h
        </span>
        <span>
          hono<span class="brand-slash">/</span>decks
        </span>
      </a>
      <nav class="top-nav" aria-label="Primary navigation">
        <a href="/docs/getting-started" aria-current={activePath.startsWith("/docs") ? "page" : undefined}>
          Guides
        </a>
        <a href="/api" aria-current={activePath === "/api" ? "page" : undefined}>
          API
        </a>
        <a href="https://github.com/ts-76/hono-slides">GitHub ↗</a>
      </nav>
      <details class="mobile-menu">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          {docsNavigation.map((item) => (
            <a href={item.href}>{item.label}</a>
          ))}
          <a href="https://github.com/ts-76/hono-slides">GitHub ↗</a>
        </nav>
      </details>
    </header>
  );
}

export function DocsLayout({
  activePath,
  title,
  description,
  children,
}: {
  activePath: string;
  title: string;
  description: string;
  children: Child;
}) {
  return (
    <main class="docs-layout">
      <aside class="docs-sidebar" aria-label="Documentation sections">
        <p class="sidebar-label">Documentation</p>
        <nav>
          {docsNavigation.map((item) => (
            <a href={item.href} aria-current={activePath === item.href ? "page" : undefined}>
              <span>{item.label}</span>
              <small>{item.detail}</small>
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
        <div class="prose">{children}</div>
      </article>
      <aside class="docs-rail" aria-label="On this page">
        <p>On this page</p>
        <a href="#overview">概要</a>
        <a href="#example">実装例</a>
        <a href="#notes">注意点</a>
      </aside>
    </main>
  );
}

export function CodeBlock({ code, label = "TypeScript" }: { code: string; label?: string }) {
  return (
    <figure class="code-block">
      <figcaption>
        <span>{label}</span>
        <span aria-hidden="true">•••</span>
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function Callout({ title, children }: { title: string; children: Child }) {
  return (
    <aside class="callout">
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}

export function RouteTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Route / API</th>
            <th>役割</th>
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
