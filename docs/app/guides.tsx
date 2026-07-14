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

const installCode = `bun add hono-decks
bunx hono-decks init --out src/decks.ts`;

const compileCode = `bunx hono-decks compile \\
  --root decks \\
  --out src/generated \\
  --mount /decks`;

const firstDeckCode = `---
title: Welcome
description: My first hono-decks presentation
---

---
layout: cover
---

# Welcome

This deck is served from my Hono app.

---

## Next slide

- Write slides in MDX
- Serve them with Hono`;

const mountCode = `// src/index.ts
import { Hono } from "hono"
import { createDecksRouter } from "./decks"

const app = new Hono()
app.route("/decks", createDecksRouter())

export default app`;

const expectedFiles = (locale: Locale) => locale === "ja" ? `decks/
└── welcome/
    └── deck.mdx
src/
├── decks.ts              # アプリ側で編集
└── generated/
    └── decks.ts          # 自動生成。編集しない` : `decks/
└── welcome/
    └── deck.mdx
src/
├── decks.ts              # app-owned facade
└── generated/
    └── decks.ts          # generated; do not edit`;

const buildScriptsCode = `{
  "scripts": {
    "decks:compile": "hono-decks compile --root decks --out src/generated --mount /decks",
    "dev": "bun run decks:compile && vite",
    "build": "bun run decks:compile && vite build"
  }
}`;

const configCode = `// src/decks.config.ts
import { defineDecksConfig } from "hono-decks"

type AppEnv = {
  Bindings: {
    ENVIRONMENT: "development" | "production"
    PRESENTER_ENABLED?: string
  }
  Variables: {
    language: string
  }
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  router: {
    dev: (c) => c.env.ENVIRONMENT !== "production",
    document: {
      lang: ({ c }) => c.get("language"),
    },
    presenter: {
      enabled: ({ c, dev }) => dev || c.env.PRESENTER_ENABLED === "true",
    },
  },
})`;

const facadeCode = `// src/decks.ts
import { mergeDecksRouterOptions, type DecksRouterOverrides } from "hono-decks"
import config from "./decks.config"
import { decks } from "./generated/decks"

export const deckMountPath = config.mountPath ?? "/decks"
export const deckSource = config.source?.(decks.source) ?? decks.source

export function createDecksRouter(overrides: DecksRouterOverrides = {}) {
  return decks.router(
    mergeDecksRouterOptions(
      { ...config.router, source: deckSource },
      overrides,
    ),
  )
}`;

const componentCode = `// decks/welcome/components/index.tsx
export function Metric(props: { value: string; label: string }) {
  return <figure>
    <strong>{props.value}</strong>
    <figcaption>{props.label}</figcaption>
  </figure>
}`;

const componentUsageCode = `<Metric value="18 ms" label="Response time" />`;

const clientComponentCode = `// decks/welcome/components/client/index.tsx
import { useState } from "hono/jsx/dom"

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
}`;

const themeCode = `/* decks/welcome/theme.css */
:root {
  --hono-decks-accent-color: #ff5b1a;
}

.slide h1 {
  text-wrap: balance;
}`;

const languageMiddlewareCode = `import { languageDetector } from "hono/language"

app.use(languageDetector({
  supportedLanguages: ["ja", "en"],
  fallbackLanguage: "ja",
}))`;

const nonceMiddlewareCode = `import { Hono } from "hono"

type AppEnv = {
  Variables: {
    cspNonce: string
    language: string
  }
}

const app = new Hono<AppEnv>()

app.use("*", async (c, next) => {
  const nonce = crypto.randomUUID()
  c.set("cspNonce", nonce)
  c.header("Content-Security-Policy", [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    \`script-src 'self' 'nonce-\${nonce}'\`,
    \`style-src 'self' 'nonce-\${nonce}'\`,
    "img-src 'self' data: https:",
    "frame-src 'self' https://www.youtube.com",
  ].join("; "))
  await next()
})`;

const documentPolicyCode = `createDecksRouter({
  document: {
    lang: ({ c }) => c.get("language"),
    nonce: ({ c }) => c.get("cspNonce"),
    head: ({ surface }) => (
      <meta name="hono-decks-surface" content={surface} />
    ),
  },
})`;

const gettingStarted = (locale: Locale): Guide => locale === "ja" ? {
  title: "導入",
  description: "MDXのスライドをコンパイルし、生成されたルーターを既存のHonoアプリに組み込みます。",
  sections: [
    { id: "prerequisites", label: "必要なもの" },
    { id: "install", label: "インストール" },
    { id: "deck", label: "最初のデッキ" },
    { id: "mount", label: "ルーターの登録" },
    { id: "scripts", label: "開発・ビルド設定" },
    { id: "verify", label: "表示を確認" },
    { id: "troubleshooting", label: "困ったとき" },
    { id: "next", label: "次に読む" },
  ],
  content: <>
    <section id="prerequisites">
      <h2>必要なもの</h2>
      <p>Bun 1.2以降と、起動できるHono 4のアプリを用意します。この手順では約5分で、2枚のスライドを<code>/decks/welcome</code>に表示します。</p>
      <Callout title="先に知っておくこと"><p>MDXの変換は開発・ビルド時にBunで行います。Honoアプリは生成済みのモジュールを読み込むだけなので、Cloudflare Workersでファイルシステムを使う必要はありません。</p></Callout>
    </section>
    <section id="install">
      <h2>パッケージと接続用ファイルを用意する</h2>
      <p><code>init</code>は、生成物とHonoアプリをつなぐ<code>src/decks.ts</code>を作ります。既存ファイルは上書きしません。</p>
      <CodeBlock label="Terminal" code={installCode} locale={locale} />
    </section>
    <section id="deck">
      <h2>最初のデッキを作ってコンパイルする</h2>
      <p><code>decks/welcome/deck.mdx</code>を作成します。先頭のフロントマターはデッキ全体の情報、その次の<code>---</code>からが1枚目のスライドです。</p>
      <CodeBlock label="decks/welcome/deck.mdx" code={firstDeckCode} locale={locale} />
      <p>MDXをHono JSXモジュールへ変換します。成功すると<code>src/generated/</code>が作成されます。</p>
      <CodeBlock label="Terminal" code={compileCode} locale={locale} />
      <CodeBlock label="Generated files" code={expectedFiles(locale)} locale={locale} />
      <p><code>src/decks.ts</code>と<code>deck.mdx</code>は編集できます。<code>src/generated/</code>はコンパイルのたびに更新されるため、直接編集しません。</p>
    </section>
    <section id="mount">
      <h2>ルーターを登録する</h2>
      <p>既存のHonoアプリへ、生成済みルーターを<code>/decks</code>配下として追加します。</p>
      <CodeBlock code={mountCode} locale={locale} />
      <p>コンパイル時の<code>--mount /decks</code>と<code>app.route("/decks", …)</code>には、同じパスを指定します。</p>
    </section>
    <section id="scripts">
      <h2>開発とビルドの前に必ずコンパイルする</h2>
      <p>MDXの変更が生成物へ反映されるように、アプリの<code>dev</code>と<code>build</code>より先に<code>decks:compile</code>を実行します。下の<code>vite</code>部分は、既存アプリのコマンドへ置き換えてください。</p>
      <CodeBlock label="package.json" code={buildScriptsCode} locale={locale} />
    </section>
    <section id="verify">
      <h2>ブラウザで表示を確認する</h2>
      <CodeBlock label="Terminal" code={`bun run dev`} locale={locale} />
      <p>開発サーバーが表示したURLの<code>/decks/welcome</code>を開きます。Welcomeスライドが表示され、左右の操作または矢印キーで2枚目へ移動できれば導入は完了です。</p>
      <Callout title="URLの例"><p><code>http://localhost:3000/decks/welcome</code>。別のポートが表示された場合は、開発サーバーのURLを使ってください。</p></Callout>
    </section>
    <section id="troubleshooting">
      <h2>うまくいかないとき</h2>
      <dl class="troubleshooting-list">
        <div><dt><code>src/generated/decks.ts</code>がない</dt><dd><code>bunx hono-decks compile</code>を再実行し、<code>decks/welcome/deck.mdx</code>があることと、<code>--root</code>が<code>decks</code>を指していることを確認します。</dd></div>
        <div><dt><code>/decks</code>が404になる</dt><dd>コンパイルと<code>app.route()</code>に指定したパスをそろえ、<code>decks.ts</code>の読み込み先を確認します。</dd></div>
        <div><dt>WorkerのビルドにNode.js用モジュールが含まれる</dt><dd>実行時APIは<code>hono-decks</code>から読み込みます。<code>hono-decks/node</code>はコンパイル用スクリプトだけで使用してください。</dd></div>
      </dl>
    </section>
    <section id="next">
      <h2>次に読む</h2>
      <p>まずは<a class="text-link" href={localizedHref("/docs/authoring", locale)}>スライドの書き方</a>へ進んでください。環境変数や公開画面を変える必要が出たときは、<a class="text-link" href={localizedHref("/docs/configuration", locale)}>設定</a>と<a class="text-link" href={localizedHref("/docs/routing", locale)}>ルートと画面</a>を参照します。</p>
      <DeployToCloudflare locale={locale} />
    </section>
  </>,
} : {
  title: "Get started",
  description: "Compile an MDX deck, mount the generated router in an existing Hono application, and verify it in your browser.",
  sections: [
    { id: "prerequisites", label: "Prerequisites" },
    { id: "install", label: "Install" },
    { id: "deck", label: "First deck" },
    { id: "mount", label: "Mount the router" },
    { id: "scripts", label: "Dev and build scripts" },
    { id: "verify", label: "Verify the result" },
    { id: "troubleshooting", label: "Troubleshooting" },
    { id: "next", label: "Next steps" },
  ],
  content: <>
    <section id="prerequisites"><h2>Check the prerequisites</h2><p>Start with Bun 1.2 or later and a working Hono 4 application. In about five minutes, this guide will serve a two-slide deck at <code>/decks/welcome</code>.</p><Callout title="What runs where"><p>Bun compiles MDX during development and builds. The Hono application only imports generated modules, so a deployed Worker never needs filesystem access.</p></Callout></section>
    <section id="install"><h2>Install the package and create the facade</h2><p><code>init</code> creates <code>src/decks.ts</code>, the app-owned connection between generated files and the Hono application. It refuses to overwrite an existing file.</p><CodeBlock label="Terminal" code={installCode} locale={locale} /></section>
    <section id="deck"><h2>Create and compile the first deck</h2><p>Create <code>decks/welcome/deck.mdx</code>. The first frontmatter block describes the whole deck; the next <code>---</code> starts slide one.</p><CodeBlock label="decks/welcome/deck.mdx" code={firstDeckCode} locale={locale} /><p>Compile the MDX into Hono JSX modules. A successful run creates <code>src/generated/</code>.</p><CodeBlock label="Terminal" code={compileCode} locale={locale} /><CodeBlock label="Generated files" code={expectedFiles(locale)} locale={locale} /><p>Edit <code>src/decks.ts</code> and <code>deck.mdx</code> as needed. Never edit <code>src/generated/</code>; each compile replaces it.</p></section>
    <section id="mount"><h2>Mount the router</h2><p>Add the generated router to the existing Hono app under <code>/decks</code>.</p><CodeBlock code={mountCode} locale={locale} /><p>Keep the compile-time <code>--mount /decks</code> path aligned with <code>app.route("/decks", …)</code>.</p></section>
    <section id="scripts"><h2>Compile before development and builds</h2><p>Run <code>decks:compile</code> before the app's <code>dev</code> and <code>build</code> commands so MDX changes reach the generated modules. Replace <code>vite</code> below with the existing commands in your app.</p><CodeBlock label="package.json" code={buildScriptsCode} locale={locale} /></section>
    <section id="verify"><h2>Verify it in the browser</h2><CodeBlock label="Terminal" code="bun run dev" locale={locale} /><p>Open <code>/decks/welcome</code> on the local URL printed by the dev server. The setup works when the Welcome slide appears and the controls or arrow keys move to slide two.</p><Callout title="Expected URL"><p><code>http://localhost:3000/decks/welcome</code>. If your dev server selects another port, use the printed URL.</p></Callout></section>
    <section id="troubleshooting"><h2>Troubleshooting</h2><dl class="troubleshooting-list"><div><dt>Missing <code>src/generated/decks.ts</code></dt><dd>Run <code>bunx hono-decks compile</code> again. Confirm that <code>decks/welcome/deck.mdx</code> exists and <code>--root</code> points at <code>decks</code>.</dd></div><div><dt><code>/decks</code> returns 404</dt><dd>Align the compile and <code>app.route()</code> mount paths, then check the facade import.</dd></div><div><dt>Node modules enter the Worker bundle</dt><dd>Import runtime APIs from <code>hono-decks</code>. Keep <code>hono-decks/node</code> in build scripts only.</dd></div></dl></section>
    <section id="next"><h2>Choose the next step</h2><p>Continue with <a class="text-link" href={localizedHref("/docs/authoring", locale)}>authoring slides</a>. Open <a class="text-link" href={localizedHref("/docs/configuration", locale)}>configuration</a> or <a class="text-link" href={localizedHref("/docs/routing", locale)}>routes and UI</a> only when you need environment bindings or different public surfaces.</p><DeployToCloudflare locale={locale} /></section>
  </>,
};

const authoring = (locale: Locale): Guide => locale === "ja" ? {
  title: "MDXでスライドを書く",
  description: "スライドの追加から、段階表示、コンポーネント、画像、テーマまでを必要な順に説明します。",
  sections: [{ id: "structure", label: "デッキとスライド" }, { id: "metadata", label: "フロントマター" }, { id: "fragments", label: "段階表示" }, { id: "components", label: "コンポーネント" }, { id: "assets", label: "画像と埋め込み" }, { id: "theme", label: "テーマ" }, { id: "verify", label: "確認と次の手順" }],
  content: <>
    <section id="structure"><h2>1つのデッキを1つのディレクトリに置く</h2><p><code>decks/&lt;slug&gt;/deck.mdx</code>が基本形です。ディレクトリ名がURLの<code>:slug</code>になります。たとえば<code>decks/launch/deck.mdx</code>は<code>/decks/launch</code>で表示されます。</p><p>ファイル先頭の<code>---</code>はデッキ情報、その後の<code>---</code>は新しいスライドの開始を表します。</p><CodeBlock label="decks/launch/deck.mdx" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} /></section>
    <section id="metadata"><h2>デッキ全体と各スライドの設定を分ける</h2><p>ファイル先頭では<code>title</code>、<code>description</code>、既定の<code>transition</code>などを指定します。各スライドの直前では、そのスライドだけの<code>title</code>や<code>layout</code>を指定できます。設定が不要なスライドはフロントマターを省略できます。</p><Callout title="最初に必要なのはtitleだけ"><p>見た目やトランジションは後から追加できます。まず本文を書き、必要なスライドにだけ<code>layout</code>を指定すると把握しやすくなります。</p></Callout></section>
    <section id="fragments"><h2>クリックごとに内容を表示する</h2><p><code>&lt;Fragment&gt;</code>で囲んだ内容は段階表示になります。<code>order</code>は同じスライド内の表示順です。通常の箇条書きを一項目ずつ出す場合は<code>fragments: list</code>をスライドのフロントマターに指定します。</p><CodeBlock label="MDX" locale={locale} code={`---
fragments: list
---

- First point
- Second point

<Fragment order={3}>Final note</Fragment>`} /></section>
    <section id="components"><h2>まずサーバーコンポーネントを使う</h2><p><code>components/index.tsx</code>の名前付きエクスポートは、同じデッキのMDXからタグとして使えます。デッキごとに登録されるため、別のデッキと同じ名前でも衝突しません。</p><CodeBlock locale={locale} code={componentCode} /><CodeBlock label="MDX" locale={locale} code={componentUsageCode} /><h3>ブラウザ操作が必要な場合だけIslandにする</h3><p>クリックや状態管理が必要な部品は<code>components/client/index.tsx</code>へ置きます。クライアント用コードは自動生成されるため、通常は配信用ルートを追加する必要はありません。</p><CodeBlock locale={locale} code={clientComponentCode} /></section>
    <section id="assets"><h2>画像はデッキからの相対パスで指定する</h2><p>画像を<code>decks/launch/assets/</code>に置き、<code>deck.mdx</code>から相対パスで参照します。コンパイル時に配信用URLへ変換されます。YouTubeやリンクカードは、URLだけの行ではなく明示的な記法を使います。</p><CodeBlock label="MDX" locale={locale} code={`![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[card](https://hono.dev/docs/)`} /><p>画像をR2から配信する場合は、MDXを変えずに<code>withR2Assets()</code>で取得元を差し替えます。これは最初のデッキには不要です。</p></section>
    <section id="theme"><h2>デッキ単位でテーマを追加する</h2><p><code>deck.mdx</code>と同じディレクトリに<code>theme.css</code>を置くと、そのデッキだけに適用されます。まずCSS変数で色を調整し、必要な部分だけ通常のセレクターを追加します。</p><CodeBlock label="decks/welcome/theme.css" locale={locale} code={themeCode} /></section>
    <section id="verify"><h2>コンパイルして変更を確認する</h2><CodeBlock label="Terminal" code="bun run decks:compile" locale={locale} /><p>コンパイルエラーには対象ファイルとスライド番号が表示されます。表示を確認したら、公開画面を変える場合は<a class="text-link" href={localizedHref("/docs/routing", locale)}>ルートと画面</a>、環境変数やR2を使う場合は<a class="text-link" href={localizedHref("/docs/configuration", locale)}>設定</a>へ進みます。</p></section>
  </>,
} : {
  title: "Author an MDX deck",
  description: "Add slides, staged content, components, assets, and a deck-local theme in the order you need them.",
  sections: [{ id: "structure", label: "Decks and slides" }, { id: "metadata", label: "Frontmatter" }, { id: "fragments", label: "Staged content" }, { id: "components", label: "Components" }, { id: "assets", label: "Assets and embeds" }, { id: "theme", label: "Theme" }, { id: "verify", label: "Verify and continue" }],
  content: <>
    <section id="structure"><h2>Keep each deck in its own directory</h2><p>Use <code>decks/&lt;slug&gt;/deck.mdx</code>. The directory name becomes the URL slug, so <code>decks/launch/deck.mdx</code> appears at <code>/decks/launch</code>.</p><p>The opening <code>---</code> block contains deck metadata. Later separators start new slides.</p><CodeBlock label="decks/launch/deck.mdx" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} /></section>
    <section id="metadata"><h2>Separate deck and slide metadata</h2><p>The opening block can define the deck <code>title</code>, <code>description</code>, and default <code>transition</code>. A block immediately before a slide can define that slide's <code>title</code> or <code>layout</code>. Omit slide frontmatter when no override is needed.</p><Callout title="Start with title only"><p>Write the content first. Add layouts and transitions only where they make the presentation easier to follow.</p></Callout></section>
    <section id="fragments"><h2>Reveal content one step at a time</h2><p>Wrap content in <code>&lt;Fragment&gt;</code> for staged display. <code>order</code> controls the reveal order within a slide. Use <code>fragments: list</code> when every list item should appear separately.</p><CodeBlock label="MDX" locale={locale} code={`---
fragments: list
---

- First point
- Second point

<Fragment order={3}>Final note</Fragment>`} /></section>
    <section id="components"><h2>Start with server components</h2><p>Named exports from <code>components/index.tsx</code> are available as tags in that deck's MDX. Registries are deck-local, so the same component name can exist in another deck.</p><CodeBlock locale={locale} code={componentCode} /><CodeBlock label="MDX" locale={locale} code={componentUsageCode} /><h3>Use an island only for browser interaction</h3><p>Put components that need clicks or local state in <code>components/client/index.tsx</code>. The compiler generates and serves the client entry, so ordinary applications do not add a separate asset route.</p><CodeBlock locale={locale} code={clientComponentCode} /></section>
    <section id="assets"><h2>Reference images relative to the deck</h2><p>Place images under <code>decks/launch/assets/</code> and reference them from <code>deck.mdx</code>. Compilation converts them to served asset URLs. Use explicit syntax for YouTube and link cards; a bare URL remains a link.</p><CodeBlock label="MDX" locale={locale} code={`![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[card](https://hono.dev/docs/)`} /><p>For R2 delivery, wrap the source with <code>withR2Assets()</code> without changing MDX paths. The first deck does not need this.</p></section>
    <section id="theme"><h2>Add a deck-local theme</h2><p>Place <code>theme.css</code> beside <code>deck.mdx</code> to style only that deck. Start with the provided CSS variables, then add selectors for specific content.</p><CodeBlock label="decks/welcome/theme.css" locale={locale} code={themeCode} /></section>
    <section id="verify"><h2>Compile and verify the change</h2><CodeBlock label="Terminal" code="bun run decks:compile" locale={locale} /><p>Compile errors identify the source file and slide number. After the deck renders, continue to <a class="text-link" href={localizedHref("/docs/routing", locale)}>routes and UI</a> for public surfaces or <a class="text-link" href={localizedHref("/docs/configuration", locale)}>configuration</a> for bindings and R2.</p></section>
  </>,
};

const routing = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "公開する画面を選ぶ" : "Choose routes and UI surfaces",
    description: isJa ? "マウントしたURLからどの画面が作られるかを確認し、必要な画面だけを公開・カスタマイズします。" : "See which URLs a mounted router creates, then expose and customize only the surfaces your application needs.",
    sections: isJa ? [{ id: "model", label: "ルートの考え方" }, { id: "surfaces", label: "標準ルート" }, { id: "visibility", label: "公開範囲" }, { id: "custom", label: "画面のカスタマイズ" }, { id: "state", label: "URL状態と次の手順" }] : [{ id: "model", label: "Routing model" }, { id: "surfaces", label: "Default routes" }, { id: "visibility", label: "Public access" }, { id: "custom", label: "Custom pages" }, { id: "state", label: "URL state and next steps" }],
    content: <>
      <section id="model"><h2>{isJa ? "app.route()のパスをすべての画面の起点にする" : "The app.route() path is the base for every deck URL"}</h2><p>{isJa ? <><code>app.route("/decks", createDecksRouter())</code>と登録すると、すべてのルートは<code>/decks</code>配下に作られます。<code>:slug</code>には<code>decks/</code>直下のディレクトリ名が入ります。</> : <>Mounting <code>app.route("/decks", createDecksRouter())</code> places every generated route under <code>/decks</code>. The directory name below <code>decks/</code> becomes <code>:slug</code>.</>}</p><Callout title={isJa ? "通常開くURL" : "The URL most people open"}><p>{isJa ? <>閲覧者には<code>/decks/:slug</code>を案内します。<code>/render</code>はビューアー内部のiframe用で、直接案内するページではありません。</> : <>Share <code>/decks/:slug</code> with viewers. <code>/render</code> is the iframe runtime used inside the viewer, not the normal public entry point.</>}</p></Callout></section>
      <section id="surfaces"><h2>{isJa ? "画面ごとの役割を確認する" : "Understand each generated surface"}</h2><RouteTable locale={locale} rows={[["/", isJa ? "公開デッキの一覧。不要なら無効化できます" : "Public deck index; can be disabled"], ["/:slug", isJa ? "閲覧用ビューアー。操作ボタンとスライドを表示します" : "Viewer with controls and the slide frame"], ["/:slug/render", isJa ? "ビューアー内のスライド本体" : "Slide document inside the viewer iframe"], ["/:slug/presentation", isJa ? "投影・共有画面用のスライド表示" : "Projection or shared display"], ["/:slug/presenter", isJa ? "発表者向け。次のスライドやノートを表示します" : "Speaker view with next slide and notes"], ["/:slug/print", isJa ? "印刷・PDF保存向けの全スライド表示" : "All slides for printing or browser PDF"], ["/:slug/embed", isJa ? "外部iframe用。embedを有効にした場合だけ作成します" : "External iframe route; created only when embed is enabled"]]} /></section>
      <section id="visibility"><h2>{isJa ? "不要な画面を閉じる" : "Disable surfaces you do not expose"}</h2><p>{isJa ? <>最初は標準設定のままで構いません。公開要件が決まったら<code>pages</code>で不要な画面を<code>false</code>にします。<code>dev</code>は自動判定されないため、下書きを開発環境だけで表示したい場合は明示的に設定します。</> : <>The defaults are fine for local work. Once public requirements are known, set unused <code>pages</code> to <code>false</code>. <code>dev</code> is never inferred, so resolve it explicitly when drafts should appear only in development.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  dev: (c) => c.env.ENVIRONMENT !== "production",
  pages: {
    index: false,
    print: false,
    presenter: ({ dev }) => dev,
  },
})`} /><p>{isJa ? "関数を指定した項目はリクエストごとに評価されるため、認証状態や環境変数による制御にも使えます。" : "Resolver functions run per request, so they can also check authentication or environment bindings."}</p></section>
      <section id="custom"><h2>{isJa ? "既定UIを少し変えるか、アプリ側で画面を作る" : "Customize the default UI or build an app-owned page"}</h2><p>{isJa ? <><code>pages.index.render</code>はデッキ一覧の見た目だけを変えたい場合に使います。<code>defaultContent</code>を残せば、標準の一覧を再利用できます。</> : <>Use <code>pages.index.render</code> to change only the deck index. Keep <code>defaultContent</code> to reuse the built-in list.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  pages: {
    index: {
      title: ({ decks }) => String(decks.length) + " decks",
      render: ({ title, defaultContent }) => <main><h1>{title}</h1>{defaultContent}</main>,
    },
  },
})`} /><h3>{isJa ? "Honoアプリ独自の画面を作る" : "Build a route owned by the Hono app"}</h3><p>{isJa ? <><code>deckContext()</code>は、独自の詳細画面や管理画面でデッキ、目次、URL情報を使うためのミドルウェアです。標準UIを使うだけなら不要です。</> : <><code>deckContext()</code> supplies deck, TOC, and URL metadata to custom detail or admin routes. You do not need it when the standard UI is enough.</>}</p><CodeBlock locale={locale} code={`app.get(
  "/decks/:slug/about",
  deckContext({ source: deckSource, mountPath: "/decks" }),
  (c) => c.json({
    title: c.var.deck.meta.title,
    slides: c.var.deck.slides.length,
    toc: c.var.deckToc,
  }),
)`} /></section>
      <section id="state"><h2>{isJa ? "同じスライド位置をURLで共有する" : "Share the same slide position by URL"}</h2><p>{isJa ? <>ビューアー、発表画面、発表者画面は<code>?slide=2&amp;step=1</code>を共通して使います。<code>slide</code>はスライド番号、<code>step</code>は段階表示の位置です。</> : <>Viewer, presentation, and presenter share <code>?slide=2&amp;step=1</code>. <code>slide</code> selects the slide and <code>step</code> selects the fragment reveal state.</>}</p><p>{isJa ? <>外部サイトへ埋め込む場合は<a class="text-link" href={localizedHref("/docs/security", locale)}>セキュリティ</a>で許可するオリジンを設定します。すべてのオプションを探す場合は<a class="text-link" href={localizedHref("/api", locale)}>API</a>を参照してください。</> : <>For external iframe use, continue to <a class="text-link" href={localizedHref("/docs/security", locale)}>security</a> and allow explicit origins. Use the <a class="text-link" href={localizedHref("/api", locale)}>API reference</a> when you need a specific option.</>}</p></section>
    </>,
  };
};

const configuration = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "設定ファイル" : "Configuration",
    description: isJa
      ? "最小構成から何を変えたいかに応じて、コンパイル設定と任意のdecks.config.tsを使い分けます。"
      : "Start from the generated facade, then add compile settings or an optional decks.config.ts only for the behavior you need.",
    sections: isJa
      ? [
          { id: "files", label: "ファイル構成" },
          { id: "compile", label: "コンパイル設定" },
          { id: "runtime", label: "実行時設定" },
          { id: "facade", label: "設定の優先順位" },
          { id: "reference", label: "設定項目" },
        ]
      : [
          { id: "files", label: "File ownership" },
          { id: "compile", label: "Compile settings" },
          { id: "runtime", label: "Runtime settings" },
          { id: "facade", label: "Facade and overrides" },
          { id: "reference", label: "Configuration map" },
        ],
    content: <>
      <section id="files">
        <h2>{isJa ? "まず設定ファイルが必要か判断する" : "First decide whether you need a config file"}</h2>
        <p>{isJa ? <><code>hono-decks init</code>が作る<code>src/decks.ts</code>だけで、デッキの表示はできます。環境変数で公開範囲を変える、R2から画像を読む、CSPや埋め込みを設定する場合に<code>src/decks.config.ts</code>を追加します。</> : <>The generated <code>src/decks.ts</code> is enough to render decks. Add <code>src/decks.config.ts</code> when environment bindings control access, assets come from R2, or you need CSP and embed policy.</>}</p>
        <dl class="configuration-map">
          <div><dt><code>package.json</code></dt><dd>{isJa ? "デッキの読み込み元、出力先、公開パスをコンパイルコマンドに指定します。" : "Pins the compile root, output directory, and mount path."}</dd></div>
          <div><dt><code>decks.config.ts</code></dt><dd>{isJa ? "アプリ側で管理する任意の設定ファイルです。データの取得元やルーターの設定をまとめます。" : "Optional app-owned configuration that connects the source and router options to your environment."}</dd></div>
          <div><dt><code>decks.ts</code></dt><dd>{isJa ? "生成物とアプリの設定を読み込み、ルーターを作成します。" : "A stable facade that combines the generated source, config, and call-site overrides."}</dd></div>
          <div><dt><code>generated/</code></dt><dd>{isJa ? "コンパイラーが生成するマニフェストとスライドのモジュールです。" : "Compiler-owned manifest and slide modules."}</dd></div>
        </dl>
        <Callout title={isJa ? "2種類の設定を混ぜない" : "Keep two kinds of settings separate"}><p>{isJa ? <>CLIはMDXをどこから読み、どこへ生成するかを決めます。<code>decks.config.ts</code>は、生成後のデッキをリクエスト時にどう公開するかを決めます。</> : <>The CLI decides where MDX is read and generated. <code>decks.config.ts</code> decides how compiled decks behave for each request.</>}</p></Callout>
      </section>
      <section id="compile">
        <h2>{isJa ? "コンパイル設定をスクリプトに書く" : "Pin compile settings in scripts"}</h2>
        <p>{isJa ? <><code>--root</code>と<code>--out</code>は必須です。<code>--mount</code>は画像などのURLの基準になるため、Honoの<code>app.route()</code>と同じパスにします。</> : <><code>--root</code> and <code>--out</code> are required. <code>--mount</code> becomes the base for asset URLs, so keep it aligned with the Hono <code>app.route()</code> path.</>}</p>
        <CodeBlock label="package.json" code={buildScriptsCode} locale={locale} />
        <p>{isJa ? <><code>--ogp-cache</code>を指定するとLinkCardのメタデータを保存できます。<code>--refresh-ogp</code>は、保存済みデータをネットワークから更新するときに使います。</> : <><code>--ogp-cache</code> makes LinkCard metadata reproducible. Use <code>--refresh-ogp</code> only when intentionally refreshing it from the network.</>}</p>
      </section>
      <section id="runtime">
        <h2>{isJa ? "リクエストごとに変わる値を設定する" : "Configure values that change per request"}</h2>
        <p>{isJa ? <><code>defineDecksConfig()</code>を使うと、HonoのBindingsとVariablesを含めて型を確認できます。<code>dev</code>は自動判定されないため、環境変数から明示的に返します。</> : <>Use <code>defineDecksConfig()</code> to preserve Hono Bindings and Variables types. <code>dev</code> is never inferred, so resolve it explicitly from an environment binding.</>}</p>
        <CodeBlock code={configCode} locale={locale} />
        <p>{isJa ? <><code>c.get("language")</code>を使う例では、Honoの<code>languageDetector()</code>を先に登録します。手順は<a class="text-link" href={localizedHref("/docs/security#language", locale)}>安全に公開する</a>で確認できます。多言語対応が不要なら<code>lang: "ja"</code>のように固定値を指定します。</> : <>The <code>c.get("language")</code> example assumes Hono's <code>languageDetector()</code> is registered first; see <a class="text-link" href={localizedHref("/docs/security#language", locale)}>publish safely</a>. For a single-language app, use a fixed value such as <code>lang: "en"</code>.</>}</p>
      </section>
      <section id="facade">
        <h2>{isJa ? "上書きの優先順位を決める" : "Make precedence explicit in the facade"}</h2>
        <p>{isJa ? <>設定は、生成時の初期値、アプリの設定、呼び出し元の指定の順に上書きされます。<code>mergeDecksRouterOptions()</code>を使うと、<code>viewer</code>、<code>presenter</code>、<code>document</code>などの入れ子になった設定も正しく結合できます。</> : <>The precedence is generated defaults, app config, then call-site overrides. <code>mergeDecksRouterOptions()</code> preserves nested options such as <code>viewer</code>, <code>presenter</code>, and <code>document</code>.</>}</p>
        <CodeBlock code={facadeCode} locale={locale} />
        <Callout title={isJa ? "公開パスをそろえる" : "One mount path"}><p>{isJa ? <>コンパイル時の<code>--mount</code>、設定ファイルの<code>mountPath</code>、<code>app.route()</code>には同じパスを指定します。異なるパスを指定すると、画像のURLやcanonical URLが正しく生成されません。</> : <>Keep compile-time <code>--mount</code>, config <code>mountPath</code>, and <code>app.route()</code> identical. A mismatch breaks asset URLs and canonical paths.</>}</p></Callout>
      </section>
      <section id="reference">
        <h2>{isJa ? "主な設定項目" : "Choose the right configuration boundary"}</h2>
        <dl class="configuration-map">
          <div><dt><code>mountPath</code></dt><dd>{isJa ? "デッキを公開するパスです。アプリのapp.route()にも同じ値を指定します。" : "The public path shared by the facade and app."}</dd></div>
          <div><dt><code>source(source)</code></dt><dd>{isJa ? "生成済みデータの取得方法を差し替えます。R2配信、キャッシュ、独自の画像取得などに使います。" : "Wraps the generated source with R2, caching, or custom asset loading."}</dd></div>
          <div><dt><code>router</code></dt><dd>{isJa ? "HTMLの共通設定、各画面、埋め込み、出力機能など、ルーターの動作を設定します。" : "Runtime options for document, pages, viewer, presenter, embed, export, and more."}</dd></div>
        </dl>
        <p><a class="text-link" href={localizedHref("/api#define-decks-config", locale)}>{isJa ? "defineDecksConfigのAPIを見る" : "Open the defineDecksConfig API"} →</a></p>
      </section>
    </>,
  };
};

const security = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "HTMLの共通設定とセキュリティ" : "Document policy and security",
    description: isJa ? "アプリとhono-decksの責任範囲を分け、言語、CSP、外部iframeの許可をすべての画面へ適用します。" : "Separate application and hono-decks responsibilities, then apply language, CSP, and iframe policy to every surface.",
    sections: isJa ? [{ id: "defaults", label: "安全な既定値" }, { id: "language", label: "言語" }, { id: "csp", label: "CSPとnonce" }, { id: "embed", label: "外部サイトへの埋め込み" }, { id: "check", label: "公開前の確認" }] : [{ id: "defaults", label: "Safe defaults" }, { id: "language", label: "Language" }, { id: "csp", label: "CSP and nonce" }, { id: "embed", label: "External embeds" }, { id: "check", label: "Pre-release checks" }],
    content: <>
      <section id="defaults"><h2>{isJa ? "最初は公開する画面を絞る" : "Start with the smallest public surface"}</h2><p>{isJa ? <>通常のビューアーは同一オリジンで動作します。外部iframe用の<code>/:slug/embed</code>は、<code>embed</code>を指定するまで作成されません。発表者画面や印刷画面を公開しない場合は、ルート設定で無効にしてください。</> : <>The ordinary viewer runs on the same origin. The external <code>/:slug/embed</code> route does not exist until <code>embed</code> is configured. Disable presenter or print routes when they should not be public.</>}</p><p>{isJa ? <>認証、認可、CSPヘッダーはHonoアプリが担当します。hono-decksは、アプリから渡された言語やnonceを生成するHTMLへ反映します。</> : <>The Hono application owns authentication, authorization, and CSP headers. hono-decks applies the resolved language and nonce to the HTML it generates.</>}</p></section>
      <section id="language"><h2>{isJa ? "Honoで言語を判定し、すべての画面へ渡す" : "Detect language in Hono and pass it to every surface"}</h2><p>{isJa ? <>Honoの<code>languageDetector()</code>は、既定でクエリ、Cookie、<code>Accept-Language</code>の順に言語を判定し、<code>c.get("language")</code>から取得できるようにします。</> : <>Hono's <code>languageDetector()</code> checks query, cookie, then <code>Accept-Language</code> by default and exposes the result through <code>c.get("language")</code>.</>}</p><CodeBlock locale={locale} code={languageMiddlewareCode} /><p>{isJa ? <><code>document.lang</code>にその値を渡すと、一覧、ビューアー、スライド、印刷、発表画面、発表者画面の<code>&lt;html lang&gt;</code>が揃います。</> : <>Pass that value to <code>document.lang</code> so index, viewer, render, print, presentation, and presenter all receive the same <code>&lt;html lang&gt;</code>.</>}</p></section>
      <section id="csp"><h2>{isJa ? "同じnonceをCSPヘッダーとHTMLへ渡す" : "Use the same nonce in the CSP header and generated HTML"}</h2><p>{isJa ? <>nonceはリクエストごとに作り、HonoのVariablesへ保存します。CSPヘッダーに含めた値と、<code>document.nonce</code>が返す値は必ず同じにします。</> : <>Create one nonce per request and store it in Hono Variables. The value in the CSP header must match the value returned by <code>document.nonce</code>.</>}</p><CodeBlock label={isJa ? "アプリ側のミドルウェア" : "Application middleware"} locale={locale} code={nonceMiddlewareCode} /><CodeBlock label={isJa ? "hono-decksの設定" : "hono-decks configuration"} locale={locale} code={documentPolicyCode} /><p>{isJa ? <>hono-decksは指定されたnonceを、パッケージが生成する<code>&lt;style&gt;</code>と<code>&lt;script&gt;</code>へ付けます。YouTube、外部画像、Islandなどを使う場合は、アプリ側のCSPにも必要な配信元を追加してください。</> : <>hono-decks adds the nonce to package-generated <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> elements. Add required origins to the application CSP when using YouTube, remote images, or islands.</>}</p></section>
      <section id="embed"><h2>{isJa ? "埋め込み先のオリジンを明示する" : "Allow explicit embedding origins"}</h2><p>{isJa ? <>外部サイトにiframeで表示するときだけ<code>embed</code>を有効にします。<code>frameAncestors</code>には、スライドを埋め込む親サイトのオリジンを指定します。<code>*</code>ではなく必要なオリジンだけを列挙してください。</> : <>Enable <code>embed</code> only for external iframe use. <code>frameAncestors</code> lists the parent origins allowed to embed the deck. List the required origins instead of using <code>*</code>.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    document: { nonce: ({ c }) => c.get("cspNonce") },
    viewer: { controls: false },
  },
})`} /><Callout title={isJa ? "許可先を省略した場合" : "When origins are omitted"}><p>{isJa ? <><code>frame-ancestors 'self'</code>が適用され、別オリジンからは埋め込めません。埋め込み用ページでは、設定したCSPに合わせて<code>X-Frame-Options</code>が取り除かれます。</> : <><code>frame-ancestors 'self'</code> applies, so another origin cannot embed the page. The embed response removes <code>X-Frame-Options</code> to let the configured CSP control framing.</>}</p></Callout></section>
      <section id="check"><h2>{isJa ? "公開前に実際のレスポンスを確認する" : "Inspect real responses before release"}</h2><dl class="troubleshooting-list"><div><dt>{isJa ? "下書きや発表者画面" : "Drafts and presenter"}</dt><dd>{isJa ? "本番で不要なルートが404になることを確認します。" : "Confirm routes that should stay private return 404 in production."}</dd></div><div><dt>CSP</dt><dd>{isJa ? "ブラウザの開発者ツールでCSP違反がなく、nonceがヘッダーとHTMLで一致することを確認します。" : "Check the browser console for CSP violations and confirm header and HTML nonces match."}</dd></div><div><dt>{isJa ? "外部埋め込み" : "External embed"}</dt><dd>{isJa ? "許可した親サイトでは表示でき、許可していないオリジンでは拒否されることを確認します。" : "Verify the allowed parent loads and an unlisted origin is rejected."}</dd></div></dl><p><a class="text-link" href={localizedHref("/api#deck-document-options", locale)}>{isJa ? "DocumentとEmbedのAPIを見る" : "Open the Document and Embed API"} →</a></p></section>
    </>,
  };
};

export function getGuide(slug: string, locale: Locale): Guide | undefined {
  const factories: Record<string, (locale: Locale) => Guide> = { "getting-started": gettingStarted, authoring, configuration, routing, security };
  return factories[slug]?.(locale);
}
