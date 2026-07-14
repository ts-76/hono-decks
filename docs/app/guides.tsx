import type { Child } from "hono/jsx";
import type { Locale } from "./i18n";
import { localizedHref } from "./i18n";
import { Callout, CodeBlock, DeployToCloudflare, RouteTable, type PageSection } from "./site";

export interface Guide {
  title: string;
  description: string;
  sections: PageSection[];
  content: Child;
}

const installCode = `bun add @hono/decks
bunx hono-decks init --out src/decks.ts
bunx hono-decks compile \\
  --root decks \\
  --out src/generated \\
  --mount /decks`;

const mountCode = `// src/index.ts
import { Hono } from "hono"
import { createDecksRouter } from "./decks"

const app = new Hono()
app.route("/decks", createDecksRouter())

export default app`;

const expectedFiles = `decks/
└── sample/
    └── deck.mdx
src/
├── decks.ts              # app-owned facade
└── generated/
    └── decks.ts          # generated; do not edit`;

const gettingStarted = (locale: Locale): Guide => locale === "ja" ? {
  title: "はじめる",
  description: "MDX deck を compile し、generated router を既存の Hono application に mount して、ブラウザで確認します。",
  sections: [
    { id: "prerequisites", label: "前提を確認" },
    { id: "install", label: "導入と生成物" },
    { id: "mount", label: "router を mount" },
    { id: "verify", label: "動作確認" },
    { id: "troubleshooting", label: "トラブルシュート" },
    { id: "next", label: "次の一手" },
  ],
  content: <>
    <section id="prerequisites">
      <h2>前提を確認する</h2>
      <p>Bun 1.2 以降と Hono 4 の application を用意します。既存 app へ追加できる route kit なので、新しい runtime や別 process は不要です。</p>
      <Callout title="所要時間"><p>依存追加から最初の deck 表示まで約5分です。compile は Node/Bun 側、生成された route は Workers を含む Hono runtime 側で動きます。</p></Callout>
    </section>
    <section id="install">
      <h2>install、初期化、compile</h2>
      <p>facade を生成してから、<code>decks/</code> の MDX を Worker-safe な module へ compile します。</p>
      <CodeBlock label="Terminal" code={installCode} locale={locale} />
      <p>成功すると、次の境界ができます。<code>src/decks.ts</code> は編集してよい facade、<code>src/generated/decks.ts</code> は compile が更新する生成物です。</p>
      <CodeBlock label="Generated files" code={expectedFiles} locale={locale} />
    </section>
    <section id="mount">
      <h2>router を mount する</h2>
      <CodeBlock code={mountCode} locale={locale} />
      <p>mount path は compile 時の <code>--mount /decks</code> と <code>app.route("/decks", …)</code> で一致させます。</p>
    </section>
    <section id="verify">
      <h2>ブラウザで動作確認する</h2>
      <CodeBlock label="Terminal" code={`bun run dev`} locale={locale} />
      <p>表示された local URL の <code>/decks</code> を開きます。deck index に <strong>sample</strong> が現れ、選ぶと viewer、presentation、presenter へ移動できれば完了です。</p>
      <Callout title="期待するURL"><p><code>http://localhost:3000/decks</code>。port は利用中の環境に応じて dev server の表示を優先してください。</p></Callout>
    </section>
    <section id="troubleshooting">
      <h2>うまくいかないとき</h2>
      <dl class="troubleshooting-list">
        <div><dt><code>src/generated/decks.ts</code> がない</dt><dd><code>bunx hono-decks compile</code> を再実行し、<code>--root</code> が deck directory を指すか確認します。</dd></div>
        <div><dt><code>/decks</code> が 404</dt><dd>compile と <code>app.route()</code> の mount path、facade の import path を揃えます。</dd></div>
        <div><dt>Worker build に Node module が混ざる</dt><dd>runtime は <code>@hono/decks</code>、compiler や filesystem API は build script だけで <code>@hono/decks/node</code> から import します。</dd></div>
      </dl>
    </section>
    <section id="next">
      <h2>次の一手</h2>
      <p><a class="text-link" href={localizedHref("/docs/authoring", locale)}>MDX と component を書く →</a></p>
      <p><a class="text-link" href={localizedHref("/docs/routing", locale)}>route と UI を組み込む →</a></p>
      <DeployToCloudflare locale={locale} />
    </section>
  </>,
} : {
  title: "Get started",
  description: "Compile an MDX deck, mount the generated router in an existing Hono application, and verify it in your browser.",
  sections: [
    { id: "prerequisites", label: "Prerequisites" },
    { id: "install", label: "Install and generate" },
    { id: "mount", label: "Mount the router" },
    { id: "verify", label: "Verify the result" },
    { id: "troubleshooting", label: "Troubleshooting" },
    { id: "next", label: "Next steps" },
  ],
  content: <>
    <section id="prerequisites"><h2>Check the prerequisites</h2><p>Start with Bun 1.2 or later and a Hono 4 application. This is a route kit for your existing app, so it does not add another runtime or process.</p><Callout title="Time to first deck"><p>Allow about five minutes. Compilation runs in Node/Bun; the generated routes run in Hono, including on Workers.</p></Callout></section>
    <section id="install"><h2>Install, initialize, and compile</h2><p>Generate the app-owned facade, then compile MDX from <code>decks/</code> into Worker-safe modules.</p><CodeBlock label="Terminal" code={installCode} locale={locale} /><p>The result has a clear boundary: edit <code>src/decks.ts</code>, but let the compiler own <code>src/generated/decks.ts</code>.</p><CodeBlock label="Generated files" code={expectedFiles} locale={locale} /></section>
    <section id="mount"><h2>Mount the router</h2><CodeBlock code={mountCode} locale={locale} /><p>Keep the compile-time <code>--mount /decks</code> path aligned with <code>app.route("/decks", …)</code>.</p></section>
    <section id="verify"><h2>Verify it in the browser</h2><CodeBlock label="Terminal" code="bun run dev" locale={locale} /><p>Open <code>/decks</code> on the local URL printed by your dev server. You should see <strong>sample</strong> in the deck index and be able to open its viewer, presentation, and presenter surfaces.</p><Callout title="Expected URL"><p><code>http://localhost:3000/decks</code>. If your dev server selects another port, use the printed URL.</p></Callout></section>
    <section id="troubleshooting"><h2>Troubleshooting</h2><dl class="troubleshooting-list"><div><dt>Missing <code>src/generated/decks.ts</code></dt><dd>Run <code>bunx hono-decks compile</code> again and confirm that <code>--root</code> points at the deck directory.</dd></div><div><dt><code>/decks</code> returns 404</dt><dd>Align the compile and <code>app.route()</code> mount paths, then check the facade import.</dd></div><div><dt>Node modules enter the Worker bundle</dt><dd>Import runtime APIs from <code>@hono/decks</code>. Keep <code>@hono/decks/node</code> in build scripts only.</dd></div></dl></section>
    <section id="next"><h2>Choose the next step</h2><p><a class="text-link" href={localizedHref("/docs/authoring", locale)}>Author MDX and components →</a></p><p><a class="text-link" href={localizedHref("/docs/routing", locale)}>Integrate routes and UI →</a></p><DeployToCloudflare locale={locale} /></section>
  </>,
};

const authoring = (locale: Locale): Guide => locale === "ja" ? {
  title: "MDX deck を書く",
  description: "frontmatter、slide separator、local component、asset を build-time module に変換します。",
  sections: [{ id: "structure", label: "deck の構成" }, { id: "components", label: "components" }, { id: "assets", label: "assets と embeds" }],
  content: <>
    <section id="structure"><h2>deck は directory 単位</h2><p>基本形は <code>decks/&lt;slug&gt;/deck.mdx</code> です。deck frontmatter は先頭に書き、水平線 <code>---</code> で slide を分割します。</p><CodeBlock label="MDX" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} /></section>
    <section id="components"><h2>components と islands</h2><p><code>components/index.tsx</code> の named export は server component、<code>components/client/index.tsx</code> は island として生成されます。registry は deck ごとなので同名 component と衝突しません。</p><CodeBlock locale={locale} code={`// decks/launch/components/index.tsx
export function Metric(props: { value: string; label: string }) {
  return <figure><strong>{props.value}</strong><figcaption>{props.label}</figcaption></figure>
}`} /></section>
    <section id="assets"><h2>assets と embeds</h2><p>相対画像は generated asset URL へ変換されます。R2 配信は <code>withR2Assets()</code> で <code>DeckSource.getAsset()</code> 境界を包みます。</p><CodeBlock label="MDX" locale={locale} code={`![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[card](https://hono.dev/docs/)

<Fragment order={2}>Shown on the second step.</Fragment>`} /></section>
  </>,
} : {
  title: "Author an MDX deck",
  description: "Turn frontmatter, slide separators, local components, and assets into build-time modules.",
  sections: [{ id: "structure", label: "Deck structure" }, { id: "components", label: "Components" }, { id: "assets", label: "Assets and embeds" }],
  content: <>
    <section id="structure"><h2>One directory per deck</h2><p>Use <code>decks/&lt;slug&gt;/deck.mdx</code>. Put deck frontmatter first and separate slides with <code>---</code>.</p><CodeBlock label="MDX" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} /></section>
    <section id="components"><h2>Components and islands</h2><p>Named exports from <code>components/index.tsx</code> become server components; exports from <code>components/client/index.tsx</code> become islands. Each deck has its own registry.</p><CodeBlock locale={locale} code={`// decks/launch/components/index.tsx
export function Metric(props: { value: string; label: string }) {
  return <figure><strong>{props.value}</strong><figcaption>{props.label}</figcaption></figure>
}`} /></section>
    <section id="assets"><h2>Assets and embeds</h2><p>Relative images become generated asset URLs. For R2 delivery, <code>withR2Assets()</code> wraps the <code>DeckSource.getAsset()</code> boundary.</p><CodeBlock label="MDX" locale={locale} code={`![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[card](https://hono.dev/docs/)

<Fragment order={2}>Shown on the second step.</Fragment>`} /></section>
  </>,
};

const routing = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "routes と UI を組み込む" : "Integrate routes and UI",
    description: isJa ? "viewer、projection、presenter、export の責任範囲と request-aware な拡張点を整理します。" : "Understand viewer, projection, presenter, and export responsibilities, then extend them with request context.",
    sections: isJa ? [{ id: "surfaces", label: "route surface" }, { id: "request-context", label: "request context" }, { id: "extensions", label: "page と extension" }] : [{ id: "surfaces", label: "Route surfaces" }, { id: "request-context", label: "Request context" }, { id: "extensions", label: "Pages and extensions" }],
    content: <>
      <section id="surfaces"><h2>{isJa ? "既定 route surface" : "Default route surfaces"}</h2><RouteTable locale={locale} rows={[["/", isJa ? "公開 deck の index" : "Public deck index"], ["/:slug", isJa ? "outer viewer と controls" : "Outer viewer and controls"], ["/:slug/render", isJa ? "slide runtime iframe" : "Slide runtime iframe"], ["/:slug/presentation", isJa ? "projection window" : "Projection window"], ["/:slug/presenter", isJa ? "speaker view" : "Speaker view"], ["/:slug/print", isJa ? "print preview" : "Print preview"]]} /></section>
      <section id="request-context"><h2>{isJa ? "request context で切り替える" : "Resolve options from request context"}</h2><p>{isJa ? <><code>dev</code> は dev server から暗黙には渡りません。boolean または resolver を router option として明示します。</> : <><code>dev</code> is not inferred from the dev server. Pass a boolean or resolver explicitly as a router option.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  dev: (c) => c.env.ENVIRONMENT !== "production",
  presenter: {
    enabled: ({ c, deck }) => deck.meta.presenter === true && Boolean(c.env.PRESENTER_ENABLED),
    viewerControl: true,
  },
})`} /></section>
      <section id="extensions"><h2>{isJa ? "独自 page と extension" : "Custom pages and extensions"}</h2><p>{isJa ? <><code>deckContext()</code> は app-owned route に compiled deck、viewer parts、TOC、meta を渡します。router 内へ別 Hono app を mount する場合は <code>extensions</code> を使います。</> : <><code>deckContext()</code> gives app-owned routes the compiled deck, viewer parts, TOC, and metadata. Use <code>extensions</code> to mount another Hono app inside the router.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  pages: {
    index: {
      title: ({ decks }) => String(decks.length) + " decks",
      render: ({ title, defaultContent }) => <main><h1>{title}</h1>{defaultContent}</main>,
    },
    print: false,
  },
})`} /><Callout title="URL state"><p>{isJa ? <>viewer / presentation / presenter は <code>?slide=2&amp;step=1</code> を共有します。</> : <>Viewer, presentation, and presenter share <code>?slide=2&amp;step=1</code>.</>}</p></Callout></section>
    </>,
  };
};

const security = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "document policy と security" : "Document policy and security",
    description: isJa ? "すべての HTML surface に request-scoped language、CSP nonce、head customization を適用します。" : "Apply request-scoped language, CSP nonces, and head customization across every HTML surface.",
    sections: isJa ? [{ id: "policy", label: "共通 policy" }, { id: "csp", label: "CSP と nonce" }, { id: "embed", label: "external embed" }] : [{ id: "policy", label: "Shared policy" }, { id: "csp", label: "CSP and nonce" }, { id: "embed", label: "External embeds" }],
    content: <>
      <section id="policy"><h2>{isJa ? "共通 document policy" : "One shared document policy"}</h2><p>{isJa ? <><code>document</code> は index、viewer、render、print、presentation、presenter に共通で適用されます。値は request-aware resolver にでき、<code>surfaces</code> で個別に上書きできます。</> : <><code>document</code> applies to index, viewer, render, print, presentation, and presenter. Values can be request-aware resolvers, with per-surface overrides.</>}</p></section>
      <section id="csp"><h2>{isJa ? "strict CSP と nonce" : "Strict CSP and nonces"}</h2><CodeBlock locale={locale} code={`createDecksRouter({
  document: {
    lang: ({ c }) => c.req.header("accept-language")?.startsWith("en") ? "en" : "ja",
    nonce: ({ c }) => c.get("secureHeadersNonce"),
    head: ({ surface }) => <meta name="hono-decks-surface" content={surface} />,
    surfaces: { presenter: { lang: "en" } },
  },
})`} /><p>{isJa ? <>解決した nonce は package が生成するすべての inline <code>&lt;style&gt;</code> と <code>&lt;script&gt;</code> に付与されます。CSP header は app middleware で設定します。</> : <>The resolved nonce is added to every package-generated inline <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code>. Configure the CSP header in app middleware.</>}</p></section>
      <section id="embed"><h2>{isJa ? "external iframe embed" : "External iframe embeds"}</h2><p>{isJa ? <>router の <code>embed</code> option は embed document、viewer sizing、CSP <code>frame-ancestors</code>、<code>X-Frame-Options</code> 除去をまとめて扱います。</> : <>The router <code>embed</code> option coordinates the embed document, viewer sizing, CSP <code>frame-ancestors</code>, and removal of <code>X-Frame-Options</code>.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    document: { nonce: ({ c }) => c.get("secureHeadersNonce") },
    viewer: { controls: false },
  },
})`} /><Callout title={isJa ? "安全な既定値" : "Safe default"}><p>{isJa ? <><code>embed</code> は opt-in で、許可 origin を省略しても <code>frame-ancestors 'self'</code> から広がりません。</> : <><code>embed</code> is opt-in. Without allowed origins, it never expands beyond <code>frame-ancestors 'self'</code>.</>}</p></Callout></section>
    </>,
  };
};

export function getGuide(slug: string, locale: Locale): Guide | undefined {
  const factories: Record<string, (locale: Locale) => Guide> = { "getting-started": gettingStarted, authoring, routing, security };
  return factories[slug]?.(locale);
}
