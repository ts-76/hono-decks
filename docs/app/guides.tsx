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

const installCode = `npm install hono-decks
npx hono-decks init`;

const compileCode = `npx hono-decks compile`;

const packageManagerCommands = [
  { name: "npm", install: "npm install hono-decks", cli: "npx hono-decks <command>" },
  { name: "pnpm", install: "pnpm add hono-decks", cli: "pnpm exec hono-decks <command>" },
  { name: "Yarn", install: "yarn add hono-decks", cli: "yarn hono-decks <command>" },
  { name: "Bun", install: "bun add hono-decks", cli: "bunx hono-decks <command>" },
] as const;

function PackageManagerTable({ locale }: { locale: Locale }) {
  const isJa = locale === "ja";
  return <div class="table-wrap">
    <table>
      <thead><tr><th>{isJa ? "パッケージマネージャー" : "Package manager"}</th><th>{isJa ? "インストール" : "Install"}</th><th>{isJa ? "CLIの実行" : "Run the CLI"}</th></tr></thead>
      <tbody>{packageManagerCommands.map((command) => <tr><td>{command.name}</td><td><code>{command.install}</code></td><td><code>{command.cli}</code></td></tr>)}</tbody>
    </table>
  </div>;
}

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
import { decks } from "./decks"

const app = new Hono()
app.route(decks.mountPath, decks.router())

export default app`;

const expectedFiles = (locale: Locale) => locale === "ja" ? `hono-decks.config.ts   # CLIと実行時の共通設定
decks/
└── welcome/
    └── deck.mdx
src/
├── decks.ts              # アプリ側で編集
└── generated/
    └── decks.ts          # 自動生成。編集しない` : `hono-decks.config.ts   # shared CLI/runtime config
decks/
└── welcome/
    └── deck.mdx
src/
├── decks.ts              # app-owned facade
└── generated/
    └── decks.ts          # generated; do not edit`;

const buildScriptsCode = `{
  "scripts": {
    "decks:compile": "hono-decks compile",
    "dev": "vite",
    "build": "vite build"
  }
}`;

const viteDecksCode = `import { honoDecks } from "hono-decks/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [honoDecks()],
})`;

const wranglerDecksCode = `{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}`;

const wranglerDevCode = `{
  "scripts": {
    "dev": "wrangler dev --live-reload"
  }
}`;

const browserRunWranglerCode = `{
  "compatibility_date": "2026-07-15",
  "browser": {
    "binding": "BROWSER",
    "remote": true
  }
}`;

const browserRunConfigCode = `// hono-decks.config.ts
import {
  defineDecksConfig,
  type DeckBrowserRunBinding,
} from "hono-decks"

type AppEnv = {
  Bindings: {
    BROWSER: DeckBrowserRunBinding
  }
  Variables: {
    deckExportAllowed: boolean
  }
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  router: {
    export: {
      browser: ({ c }) => c.env.BROWSER,
      authorize: ({ c }) => c.get("deckExportAllowed") === true,
      pdf: true,
      png: true,
    },
  },
})`;

const configCode = `// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks"

type AppEnv = {
  Bindings: {
    PRESENTER_ENABLED?: string
  }
  Variables: {
    language: string
  }
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
  router: {
    document: {
      lang: ({ c }) => c.get("language"),
    },
    presenter: {
      enabled: ({ c, dev }) => dev || c.env.PRESENTER_ENABLED === "true",
    },
  },
})`;

const facadeCode = `// src/decks.ts
import config from "../hono-decks.config"
import { createDecks } from "./generated/decks"

export const decks = createDecks(config)`;

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

const markdownSyntaxCode = [
  "# Runtime boundary",
  "",
  "Use **bold**, *emphasis*, `inline code`, and [links](https://hono.dev/).",
  "",
  "- Node for build-time I/O",
  "- Hono for runtime routes",
  "",
  "- [x] Compile the deck",
  "- [ ] Deploy the Worker",
  "",
  "| Layer | Responsibility |",
  "| :-- | :-- |",
  "| Node | Build-time I/O |",
  "| Hono | Runtime routes |",
  "",
  "~~Filesystem access at runtime~~",
  "",
  "> Keep the Worker bundle filesystem-free.",
  "",
  "```ts",
  "const runtime = \"Hono\"",
  "```",
].join("\n");

const fireSyntaxCode = `<Card fire />

<Chart fire="scale" at="2" />

:::fire{at="+2"}
Markdown block
:::

:::fire{each="item" depth="2" every="2"}
- Parent one
  - Child one
- Parent two
  - Child two
:::

<Fire effect="fade-up">
  <Heading />
  <Description />
</Fire>`;

const customFireEffectCode = `[data-fire-effect="blur-in"] {
  --fire-transform: scale(.98);
  --fire-filter: blur(12px);
  --fire-duration: .32s;
  --fire-easing: ease-out;
}`;

const customFireUsageCode = `<Chart fire="blur-in" />

:::fire{effect="blur-in"}
Markdown block
:::`;

const speakerNotesCode = `---
notes: |
  Explain why generation runs before deployment.
---

# Build once, serve anywhere

{/* Mention the generated module boundary. */}`;

const embedSyntaxCode = `![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=VIDEO_ID)
@[x](https://x.com/honojs/status/POST_ID)
@[card](https://hono.dev/docs/)
@[embed](https://example.com/demo)
@[iframe](https://example.com/demo)`;

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

const documentPolicyCode = `decks.router({
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
  description: "パッケージの追加から、最初のデッキをHonoアプリで表示するところまでを説明します。",
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
      <p>npm、pnpm、Yarn、Bunのいずれかが使える環境と、起動できるHono 4のアプリを用意します。この手順では、2枚のスライドを<code>/decks/welcome</code>に表示します。</p>
      <Callout title="コンパイルと配信は分かれています"><p>MDXの変換はローカルの開発・ビルド環境で行います。Honoアプリは生成済みモジュールを読み込むため、Cloudflare Workers上でファイルシステムへアクセスする必要はありません。</p></Callout>
    </section>
    <section id="install">
      <h2>パッケージを追加し、設定ファイルを作る</h2>
      <p>以下ではnpmを使います。<code>init</code>は、CLIと実行時で共有する<code>hono-decks.config.ts</code>と、生成コードをアプリにつなぐ<code>src/decks.ts</code>を作ります。既存ファイルは上書きしません。</p>
      <CodeBlock label="Terminal" code={installCode} locale={locale} />
      <PackageManagerTable locale={locale} />
      <p><code>&lt;command&gt;</code>には<code>init</code>や<code>compile</code>を指定します。以降の例も、利用中のパッケージマネージャーに合わせて読み替えてください。</p>
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
      <p><code>decks.mountPath</code>は設定ファイルの値から生成されるため、コンパイル時と実行時で公開パスがずれません。</p>
    </section>
    <section id="scripts">
      <h2>普段の開発コマンドにコンパイルを組み込む</h2>
      <p>HonoXやViteでは、既存のVite設定へプラグインを追加します。Viteの起動前に初回コンパイルを行い、MDXの変更を検知して再生成した後、ブラウザを更新します。</p>
      <CodeBlock label="vite.config.ts" code={viteDecksCode} locale={locale} />
      <CodeBlock label="package.json" code={buildScriptsCode} locale={locale} />
      <p>Wranglerを直接使うCloudflare Workerでは、<code>wrangler.jsonc</code>のカスタムビルドへ登録します。<code>--live-reload</code>を付けると、普段の開発コマンドだけでデッキの変更監視とブラウザ更新まで行えます。</p>
      <CodeBlock label="wrangler.jsonc" code={wranglerDecksCode} locale={locale} />
      <CodeBlock label="package.json" code={wranglerDevCode} locale={locale} />
    </section>
    <section id="verify">
      <h2>ブラウザで表示を確認する</h2>
      <CodeBlock label="Terminal" code={`npm run dev`} locale={locale} />
      <p>開発サーバーが表示したURLの<code>/decks/welcome</code>を開きます。Welcomeスライドが表示され、左右の操作または矢印キーで2枚目へ移動できれば導入は完了です。</p>
      <Callout title="URLの例"><p><code>http://localhost:3000/decks/welcome</code>。別のポートが表示された場合は、開発サーバーのURLを使ってください。</p></Callout>
    </section>
    <section id="troubleshooting">
      <h2>うまくいかないとき</h2>
      <dl class="troubleshooting-list">
        <div><dt><code>src/generated/decks.ts</code>がない</dt><dd><code>npx hono-decks compile</code>を再実行し、設定ファイルの<code>build.root</code>と<code>build.outDir</code>を確認します。</dd></div>
        <div><dt><code>/decks</code>が404になる</dt><dd><code>app.route(decks.mountPath, decks.router())</code>になっているか確認します。</dd></div>
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
    <section id="prerequisites"><h2>Check the prerequisites</h2><p>Use npm, pnpm, Yarn, or Bun with a working Hono 4 application. This guide serves a two-slide deck at <code>/decks/welcome</code>.</p><Callout title="Compilation and delivery are separate"><p>Compile MDX in your local development or build environment. The Hono application imports generated modules, so a deployed Worker never needs filesystem access.</p></Callout></section>
    <section id="install"><h2>Install the package and create the config</h2><p>The example uses npm. <code>init</code> creates the shared <code>hono-decks.config.ts</code> and the app-owned <code>src/decks.ts</code> facade. It refuses to overwrite existing files.</p><CodeBlock label="Terminal" code={installCode} locale={locale} /><PackageManagerTable locale={locale} /><p>Replace <code>&lt;command&gt;</code> with <code>init</code> or <code>compile</code>, and use the same package manager for the remaining examples.</p></section>
    <section id="deck"><h2>Create and compile the first deck</h2><p>Create <code>decks/welcome/deck.mdx</code>. The first frontmatter block describes the whole deck; the next <code>---</code> starts slide one.</p><CodeBlock label="decks/welcome/deck.mdx" code={firstDeckCode} locale={locale} /><p>Compile the MDX into Hono JSX modules. A successful run creates <code>src/generated/</code>.</p><CodeBlock label="Terminal" code={compileCode} locale={locale} /><CodeBlock label="Generated files" code={expectedFiles(locale)} locale={locale} /><p>Edit <code>src/decks.ts</code> and <code>deck.mdx</code> as needed. Never edit <code>src/generated/</code>; each compile replaces it.</p></section>
    <section id="mount"><h2>Mount the router</h2><p>Add the configured router to the existing Hono app.</p><CodeBlock code={mountCode} locale={locale} /><p><code>decks.mountPath</code> comes from the shared config, so compile-time assets and runtime routes stay aligned.</p></section>
    <section id="scripts"><h2>Integrate compilation with the existing dev command</h2><p>For HonoX or Vite, add the plugin to the existing Vite config. It compiles before Vite starts, regenerates modules when MDX changes, and reloads the browser after a successful compile.</p><CodeBlock label="vite.config.ts" code={viteDecksCode} locale={locale} /><CodeBlock label="package.json" code={buildScriptsCode} locale={locale} /><p>For a Cloudflare Worker that runs Wrangler directly, register the compiler as a custom build. The <code>--live-reload</code> flag lets the ordinary dev command watch the deck root and refresh the browser.</p><CodeBlock label="wrangler.jsonc" code={wranglerDecksCode} locale={locale} /><CodeBlock label="package.json" code={wranglerDevCode} locale={locale} /></section>
    <section id="verify"><h2>Verify it in the browser</h2><CodeBlock label="Terminal" code="npm run dev" locale={locale} /><p>Open <code>/decks/welcome</code> on the local URL printed by the dev server. The setup works when the Welcome slide appears and the controls or arrow keys move to slide two.</p><Callout title="Expected URL"><p><code>http://localhost:3000/decks/welcome</code>. If your dev server selects another port, use the printed URL.</p></Callout></section>
    <section id="troubleshooting"><h2>Troubleshooting</h2><dl class="troubleshooting-list"><div><dt>Missing <code>src/generated/decks.ts</code></dt><dd>Run <code>npx hono-decks compile</code> again and check <code>build.root</code> and <code>build.outDir</code> in the config.</dd></div><div><dt><code>/decks</code> returns 404</dt><dd>Mount <code>decks.router()</code> at <code>decks.mountPath</code>.</dd></div><div><dt>Node modules enter the Worker bundle</dt><dd>Import runtime APIs from <code>hono-decks</code>. Keep <code>hono-decks/node</code> in build scripts only.</dd></div></dl></section>
    <section id="next"><h2>Choose the next step</h2><p>Continue with <a class="text-link" href={localizedHref("/docs/authoring", locale)}>authoring slides</a>. Open <a class="text-link" href={localizedHref("/docs/configuration", locale)}>configuration</a> or <a class="text-link" href={localizedHref("/docs/routing", locale)}>routes and UI</a> only when you need environment bindings or different public surfaces.</p><DeployToCloudflare locale={locale} /></section>
  </>,
};

const authoring = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  const sections = isJa
    ? [
        { id: "structure", label: "デッキとスライド" },
        { id: "syntax", label: "本文の記法" },
        { id: "metadata", label: "フロントマター" },
        { id: "fire", label: "段階表示" },
        { id: "notes", label: "発表者ノート" },
        { id: "components", label: "コンポーネント" },
        { id: "assets", label: "画像と埋め込み" },
        { id: "theme", label: "テーマ" },
        { id: "verify", label: "確認と次の手順" },
      ]
    : [
        { id: "structure", label: "Decks and slides" },
        { id: "syntax", label: "Content syntax" },
        { id: "metadata", label: "Frontmatter" },
        { id: "fire", label: "Staged content" },
        { id: "notes", label: "Speaker notes" },
        { id: "components", label: "Components" },
        { id: "assets", label: "Assets and embeds" },
        { id: "theme", label: "Theme" },
        { id: "verify", label: "Verify and continue" },
      ];

  return {
    title: isJa ? "MDXでスライドを書く" : "Author an MDX deck",
    description: isJa
      ? "利用できるMarkdown、MDX、hono-decks独自の記法をまとめています。"
      : "Use the Markdown, MDX, and deck-specific syntax supported by the compiler.",
    sections,
    content: <>
      <section id="structure">
        <h2>{isJa ? "デッキごとにディレクトリを分ける" : "Keep each deck in its own directory"}</h2>
        <p>{isJa ? <><code>decks/&lt;slug&gt;/deck.mdx</code>が基本形です。ディレクトリ名がURLの<code>:slug</code>になります。たとえば<code>decks/launch/deck.mdx</code>は<code>/decks/launch</code>で表示されます。</> : <>Use <code>decks/&lt;slug&gt;/deck.mdx</code>. The directory name becomes the URL slug, so <code>decks/launch/deck.mdx</code> appears at <code>/decks/launch</code>.</>}</p>
        <p>{isJa ? <>ファイル先頭の<code>---</code>ブロックはデッキ情報、その後の区切り線は新しいスライドの開始を表します。スライド内の水平線として単独の<code>---</code>は使えません。</> : <>The opening <code>---</code> block contains deck metadata. Later separators start new slides, so a bare <code>---</code> cannot be used as a thematic break inside a slide.</>}</p>
        <CodeBlock label="decks/launch/deck.mdx" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} />
      </section>

      <section id="syntax">
        <h2>{isJa ? "本文はGFMとMDXで書く" : "Write slide content with GFM and MDX"}</h2>
        <p>{isJa ? "CommonMarkとGFM（テーブル、タスクリスト、打ち消し線、自動リンク）を使えます。MDXではJSX要素や式も記述できます。" : "Use CommonMark plus GFM tables, task lists, strikethrough, and autolinks. MDX adds JSX elements and expressions."}</p>
        <CodeBlock label="MDX" locale={locale} code={markdownSyntaxCode} />
        <dl class="configuration-map">
          <div><dt>{isJa ? "コードフェンス" : "Fenced code"}</dt><dd>{isJa ? <>開始行に<code>ts</code>、<code>tsx</code>、<code>css</code>などの言語名を付けると、スライド内でシンタックスハイライトされます。</> : <>Add a language such as <code>ts</code>, <code>tsx</code>, or <code>css</code> after the opening fence to enable syntax highlighting in the slide.</>}</dd></div>
          <div><dt>MDX</dt><dd>{isJa ? <>JSXコンポーネント、props、式を使えます。<code>import</code>と<code>export</code>はファイル先頭にまとめます。</> : <>Use JSX components, props, and expressions. Keep <code>import</code> and <code>export</code> statements at the top of the file.</>}</dd></div>
        </dl>
      </section>

      <section id="metadata">
        <h2>{isJa ? "デッキ全体と各スライドの設定を分ける" : "Separate deck and slide metadata"}</h2>
        <p>{isJa ? "ファイル先頭のフロントマターはデッキ全体に適用されます。区切り線の直後に置いたフロントマターは、そのスライドだけに適用されます。未定義のキーはmetaに残り、コンパイル時に警告が表示されます。" : "Opening frontmatter applies to the deck. Frontmatter immediately after a slide separator applies only to that slide. Unknown keys remain in meta but produce a warning."}</p>
        <dl class="configuration-map">
          <div><dt>{isJa ? "デッキ" : "Deck"}</dt><dd><code>title</code>, <code>description</code>, <code>author</code>, <code>tags</code>, <code>date</code>, <code>theme</code>, <code>transition</code>, <code>transitionDuration</code>, <code>transitionEasing</code>, <code>draft</code>, <code>assets</code>, <code>presenter</code></dd></div>
          <div><dt>{isJa ? "スライド" : "Slide"}</dt><dd><code>title</code>, <code>layout</code>, <code>class</code>, <code>notes</code>, <code>background</code>, <code>transition</code>, <code>transitionDuration</code>, <code>transitionEasing</code></dd></div>
          <div><dt>{isJa ? "トランジション" : "Transitions"}</dt><dd><code>none</code>, <code>fade</code>, <code>fade-out</code>, <code>slide-left</code>, <code>slide-right</code>, <code>slide-up</code>, <code>slide-down</code>, <code>view-transition</code></dd></div>
          <div><dt>{isJa ? "レイアウト" : "Layouts"}</dt><dd>{isJa ? <><code>default</code>、中央配置の<code>cover</code>と<code>statement</code>が標準です。独自名は<code>layout-&lt;name&gt;</code>クラスとして<code>theme.css</code>から指定できます。</> : <><code>default</code>, centered <code>cover</code>, and centered <code>statement</code> are built in. A custom name becomes a <code>layout-&lt;name&gt;</code> class that can be styled in <code>theme.css</code>.</>}</dd></div>
        </dl>
        <Callout title={isJa ? "最初はtitleだけで十分です" : "Start with title only"}><p>{isJa ? <>本文を書いてから、必要なスライドにだけ<code>layout</code>や<code>transition</code>を追加すると、設定が増えすぎません。</> : <>Write the content first, then add <code>layout</code> or <code>transition</code> only where they clarify the presentation.</>}</p></Callout>
      </section>

      <section id="fire">
        <h2>{isJa ? "fireで内容を順に発火する" : "Fire content one step at a time"}</h2>
        <p>{isJa ? <>コンポーネントに<code>fire</code>を付けると、送り操作に合わせて記述順に表示されます。Markdownには<code>:::fire</code>、リストには<code>:::fire&#123;each=&quot;item&quot;&#125;</code>を使います。複数のJSX要素を同時に表示するときは、まとめて<code>&lt;Fire&gt;</code>で囲みます。<code>fire</code>はコンパイル時に取り除かれ、コンポーネントのpropsには渡りません。</> : <>Add <code>fire</code> to a component to reveal it in source order. Use <code>:::fire</code> for Markdown and <code>:::fire&#123;each=&quot;item&quot;&#125;</code> for list items. Use <code>&lt;Fire&gt;</code> to group multiple JSX elements into one step. The compiler removes <code>fire</code> before rendering the component.</>}</p>
        <CodeBlock label="MDX" locale={locale} code={fireSyntaxCode} />
        <p>{isJa ? <>段階表示の考え方と<code>at</code>、<code>depth</code>、<code>every</code>は、<a href="https://sli.dev/guide/animations">Slidevの<code>v-click</code>と<code>v-clicks</code></a>に一部インスパイアされています。記法と実装はhono-decks独自で、Slidevとの互換性を保証するものではありません。<code>at=&quot;2&quot;</code>は絶対位置を、<code>at=&quot;+2&quot;</code>は相対位置を2段進める指定です。リストでは<code>depth</code>で対象にする階層、<code>every</code>で1回に表示する項目数を指定します。どちらも既定値は<code>1</code>です。</> : <>The staged-reveal model and the <code>at</code>, <code>depth</code>, and <code>every</code> options are partly inspired by Slidev's <a href="https://sli.dev/guide/animations"><code>v-click</code> and <code>v-clicks</code></a>. The syntax and implementation are specific to hono-decks and are not guaranteed to be compatible with Slidev. <code>at=&quot;2&quot;</code> is absolute, while <code>at=&quot;+2&quot;</code> advances the relative position by two. For lists, <code>depth</code> selects nested levels and <code>every</code> sets the number of items per step. Both default to <code>1</code>.</>}</p>
        <h3>{isJa ? "表示効果を選ぶ" : "Choose an effect"}</h3>
        <p>{isJa ? <>コンポーネントでは<code>fire=&quot;scale&quot;</code>、<code>:::fire</code>では<code>effect=&quot;scale&quot;</code>と指定します。標準の効果は<code>none</code>、<code>fade</code>、<code>fade-up</code>、<code>scale</code>です。独自の効果は<code>theme.css</code>で定義します。</> : <>Use <code>fire=&quot;scale&quot;</code> on a component and <code>effect=&quot;scale&quot;</code> with <code>:::fire</code>. Built-ins are <code>none</code>, <code>fade</code>, <code>fade-up</code>, and <code>scale</code>. Define custom effects in <code>theme.css</code>.</>}</p>
        <CodeBlock label="MDX" locale={locale} code={customFireUsageCode} />
        <CodeBlock label="theme.css" lang="css" locale={locale} code={customFireEffectCode} />
      </section>

      <section id="notes">
        <h2>{isJa ? "発表者ノートを書く" : "Add notes for the presenter"}</h2>
        <p>{isJa ? <><code>notes: |</code>の複数行テキストとMDXコメントは発表者ノートへまとめられ、スライド本文には出ません。通常のコードコメントとして書いたMDXコメントもノートとして扱われます。</> : <>Multiline <code>notes: |</code> text and MDX comments are combined as presenter notes and omitted from slide content. Any MDX comment is treated as a note, not as an ordinary source comment.</>}</p>
        <CodeBlock label="MDX" locale={locale} code={speakerNotesCode} />
      </section>

      <section id="components">
        <h2>{isJa ? "まずサーバーコンポーネントを使う" : "Start with server components"}</h2>
        <p>{isJa ? <><code>components/index.tsx</code>の名前付きエクスポートは、同じデッキのMDXからタグとして使えます。デッキごとに登録されるため、別のデッキと同じ名前でも衝突しません。</> : <>Named exports from <code>components/index.tsx</code> are available as tags in that deck's MDX. Registries are deck-local, so the same component name can exist in another deck.</>}</p>
        <CodeBlock lang="tsx" locale={locale} code={componentCode} />
        <CodeBlock label="MDX" locale={locale} code={componentUsageCode} />
        <h3>{isJa ? "ブラウザ操作が必要な部品だけをIslandにする" : "Use an island only for browser interaction"}</h3>
        <p>{isJa ? <><code>components/client/index.tsx</code>はクリックや状態管理が必要な部品だけに使います。クライアント用コードは自動生成されるため、通常は配信用ルートを追加する必要はありません。</> : <>Use <code>components/client/index.tsx</code> only for components that need clicks or local state. The compiler generates and serves the client entry, so ordinary applications do not add a separate asset route.</>}</p>
        <CodeBlock lang="tsx" locale={locale} code={clientComponentCode} />
      </section>

      <section id="assets">
        <h2>{isJa ? "画像を置き、外部コンテンツを埋め込む" : "Reference assets and embeds explicitly"}</h2>
        <p>{isJa ? <><code>decks/launch/assets/</code>に置いた画像は、<code>deck.mdx</code>からの相対パスで指定します。<code>youtube</code>、<code>x</code>、<code>card</code>、<code>embed</code>、<code>iframe</code>は専用記法を使います。</> : <>Reference images under <code>decks/launch/assets/</code> with paths relative to <code>deck.mdx</code>. Explicit directives are available for <code>youtube</code>, <code>x</code>, <code>card</code>, <code>embed</code>, and <code>iframe</code>.</>}</p>
        <CodeBlock label="MDX" locale={locale} code={embedSyntaxCode} />
        <p>{isJa ? <>URLだけの行は通常のリンクになります。外部iframeを公開する前に<a class="text-link" href={localizedHref("/docs/security", locale)}>CSPと許可オリジン</a>を設定してください。R2配信へ変える場合は、MDXを変えずに<code>withR2Assets()</code>で取得元を差し替えます。</> : <>A bare URL on its own line becomes a normal link. Configure <a class="text-link" href={localizedHref("/docs/security", locale)}>CSP and allowed origins</a> before publishing external iframes. To serve assets from R2, use <code>withR2Assets()</code> without changing MDX paths.</>}</p>
      </section>

      <section id="theme">
        <h2>{isJa ? "デッキ単位でテーマを追加する" : "Add a deck-local theme"}</h2>
        <p>{isJa ? <><code>deck.mdx</code>と同じディレクトリに<code>theme.css</code>を置くと、そのデッキだけに適用されます。まずCSS変数で色を調整し、必要な部分だけ通常のセレクターを追加します。</> : <>Place <code>theme.css</code> beside <code>deck.mdx</code> to style only that deck. Start with the provided CSS variables, then add selectors for specific content.</>}</p>
        <CodeBlock label="decks/welcome/theme.css" locale={locale} code={themeCode} />
      </section>

      <section id="verify">
        <h2>{isJa ? "devコマンドで変更を確認する" : "Verify changes through the dev command"}</h2>
        <CodeBlock label="Terminal" code="npm run dev" locale={locale} />
        <p>{isJa ? <>ViteまたはWranglerの<code>dev</code>実行中は、保存したMDXが自動で再コンパイルされ、成功後にブラウザへ反映されます。<code>npm run decks:compile</code>は、CIやコンパイラーだけを単独で確認するときに使います。コンパイルエラーには対象ファイルとスライド番号が表示されます。</> : <>While the Vite or Wrangler <code>dev</code> command is running, saved MDX is recompiled automatically and the browser updates after a successful compile. Use <code>npm run decks:compile</code> in CI or when checking the compiler by itself. Compile errors identify the source file and slide number.</>}</p>
        <p>{isJa ? <>表示を確認したら、公開画面を変える場合は<a class="text-link" href={localizedHref("/docs/routing", locale)}>ルートと画面</a>、環境変数やR2を使う場合は<a class="text-link" href={localizedHref("/docs/configuration", locale)}>設定</a>へ進みます。</> : <>After the deck renders, continue to <a class="text-link" href={localizedHref("/docs/routing", locale)}>routes and UI</a> for public surfaces or <a class="text-link" href={localizedHref("/docs/configuration", locale)}>configuration</a> for bindings and R2.</>}</p>
      </section>
    </>,
  };
};

const routing = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "公開するルートと画面を選ぶ" : "Choose routes and UI surfaces",
    description: isJa ? "ルーターが作成するURLを確認し、必要な画面だけを公開・カスタマイズします。" : "See which URLs a mounted router creates, then expose and customize only the surfaces your application needs.",
    sections: isJa ? [{ id: "model", label: "ルートの考え方" }, { id: "surfaces", label: "標準ルート" }, { id: "visibility", label: "公開範囲" }, { id: "custom", label: "画面のカスタマイズ" }, { id: "state", label: "URL状態と次の手順" }] : [{ id: "model", label: "Routing model" }, { id: "surfaces", label: "Default routes" }, { id: "visibility", label: "Public access" }, { id: "custom", label: "Custom pages" }, { id: "state", label: "URL state and next steps" }],
    content: <>
      <section id="model"><h2>{isJa ? "mountPathをすべてのルートの起点にする" : "Use the configured mount path for every deck URL"}</h2><p>{isJa ? <><code>app.route(decks.mountPath, decks.router())</code>と登録すると、設定した<code>mountPath</code>の下にすべてのルートが作られます。</> : <>Mounting <code>app.route(decks.mountPath, decks.router())</code> places every route below the configured mount path.</>}</p><Callout title={isJa ? "閲覧者に案内するURL" : "The URL most people open"}><p>{isJa ? <>閲覧者には<code>decks.paths(slug).viewer</code>を案内します。<code>render</code>はビューアー内のiframeが読み込むURLです。</> : <>Share <code>decks.paths(slug).viewer</code> with viewers. The render route is the iframe runtime.</>}</p></Callout></section>
      <section id="surfaces"><h2>{isJa ? "画面ごとの役割を確認する" : "Understand each generated surface"}</h2><RouteTable locale={locale} rows={[["/", isJa ? "公開デッキの一覧。不要なら無効化できます" : "Public deck index; can be disabled"], ["/:slug", isJa ? "閲覧用ビューアー。操作ボタンとスライドを表示します" : "Viewer with controls and the slide frame"], ["/:slug/render", isJa ? "ビューアー内のスライド本体" : "Slide document inside the viewer iframe"], ["/:slug/presentation", isJa ? "投影・共有画面用のスライド表示" : "Projection or shared display"], ["/:slug/presenter", isJa ? "発表者向け。次のスライドやノートを表示します" : "Speaker view with next slide and notes"], ["/:slug/print", isJa ? "印刷・PDF保存向けの全スライド表示" : "All slides for printing or browser PDF"], ["/:slug/embed", isJa ? "外部iframe用。embedを有効にした場合だけ作成します" : "External iframe route; created only when embed is enabled"]]} /></section>
      <section id="visibility"><h2>{isJa ? "使わない画面を設定ファイルで無効にする" : "Disable unused surfaces in the shared config"}</h2><p>{isJa ? <>通常は<code>hono-decks.config.ts</code>の<code>router.pages</code>で、不要な画面を<code>false</code>にします。標準では<code>embed</code>以外の画面が有効です。<code>dev</code>を省略すると、ViteとWranglerが設定する<code>NODE_ENV</code>から開発モードを判定します。</> : <>Normally, set unused surfaces to <code>false</code> in <code>router.pages</code> inside <code>hono-decks.config.ts</code>. Every standard surface except <code>embed</code> is enabled by default. When <code>dev</code> is omitted, development mode is derived from the <code>NODE_ENV</code> set by Vite or Wrangler.</>}</p><CodeBlock label="hono-decks.config.ts" locale={locale} code={`export default defineDecksConfig({
  mountPath: "/decks",
  router: {
    pages: {
      index: false,
      print: false,
      presenter: ({ dev }) => dev,
    },
  },
})`} /><p>{isJa ? "関数を指定した項目はリクエストごとに評価されるため、認証状態や環境変数による制御にも使えます。" : "Resolver functions run per request, so they can also check authentication or environment bindings."}</p><p>{isJa ? <><code>print</code>を無効にすると、標準ビューアーと外部埋め込みの印刷ボタンも表示されません。ビューアーのCmd / Ctrl + Pは専用ルートへ移動せず、ブラウザ本来の印刷として動作します。独自に追加したリンクは自動では削除されません。</> : <>Disabling <code>print</code> also removes the print button from the default viewer and external embed. Cmd / Ctrl + P then uses the browser's native print behavior instead of opening the dedicated route. Links added explicitly by your application are left unchanged.</>}</p></section>
      <section id="custom"><h2>{isJa ? "標準UIを調整する、または独自画面を作る" : "Customize the default UI or build an app-owned page"}</h2><p>{isJa ? <><code>pages.index.render</code>は、デッキ一覧の見た目だけを変える場合に使います。共通設定は<code>hono-decks.config.ts</code>に置きます。次の<code>decks.router(overrides)</code>は、特定の登録箇所だけを上書きする例です。</> : <>Use <code>pages.index.render</code> to change only the deck index. Keep shared behavior in <code>hono-decks.config.ts</code>; the following <code>decks.router(overrides)</code> example changes one mount point only.</>}</p><CodeBlock locale={locale} code={`decks.router({
  pages: {
    index: {
      title: ({ decks }) => String(decks.length) + " decks",
      render: ({ title, defaultContent }) => <main><h1>{title}</h1>{defaultContent}</main>,
    },
  },
})`} /><h3>{isJa ? "Honoアプリ独自の画面を作る" : "Build a route owned by the Hono app"}</h3><p>{isJa ? <><code>decks.context()</code>は、独自の詳細画面や管理画面へデッキ、目次、URL情報を渡します。</> : <><code>decks.context()</code> supplies deck, TOC, and URL metadata to custom detail or admin routes.</>}</p><CodeBlock locale={locale} code={`app.get(
  "/decks/:slug/about",
  decks.context(),
  (c) => c.json({
    title: c.var.deck.meta.title,
    slides: c.var.deck.slides.length,
    toc: c.var.deckToc,
  }),
)`} /></section>
      <section id="state"><h2>{isJa ? "同じスライド位置をURLで共有する" : "Share the same slide position by URL"}</h2><p>{isJa ? <>ビューアー、発表画面、発表者画面は<code>?slide=2&amp;step=1</code>を共通して使います。<code>slide</code>は1から始まるスライド番号です。<code>step</code>は0から始まり、<code>step=0</code>は段階表示がまだ発火していない状態を表します。最終スライドの最終ステップから先へ送っても、URLの値は変わりません。</> : <>Viewer, presentation, and presenter share <code>?slide=2&amp;step=1</code>. <code>slide</code> is one-based. <code>step</code> starts at zero, where <code>step=0</code> means that no staged content has fired yet. Advancing past the final step of the final slide leaves the URL unchanged.</>}</p><p>{isJa ? <>外部サイトへ埋め込む場合は<a class="text-link" href={localizedHref("/docs/security", locale)}>HTMLとセキュリティ</a>で許可するオリジンを設定します。すべてのオプションを探す場合は<a class="text-link" href={localizedHref("/api", locale)}>API</a>を参照してください。</> : <>For external iframe use, continue to <a class="text-link" href={localizedHref("/docs/security", locale)}>security</a> and allow explicit origins. Use the <a class="text-link" href={localizedHref("/api", locale)}>API reference</a> when you need a specific option.</>}</p></section>
    </>,
  };
};

const configuration = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "設定ファイル" : "Configuration",
    description: isJa
      ? "CLIと実行時で共有するhono-decks.config.tsに、生成処理と公開時の設定をまとめます。"
      : "Use one hono-decks.config.ts for both generated output and runtime behavior.",
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
        <h2>{isJa ? "設定ファイルごとの役割を確認する" : "Understand the shared config"}</h2>
        <p>{isJa ? <><code>hono-decks init</code>は、必須の<code>hono-decks.config.ts</code>と<code>src/decks.ts</code>を作ります。ビルド対象、公開パス、実行時の挙動は、この設定ファイルでまとめて管理します。</> : <><code>hono-decks init</code> creates the required <code>hono-decks.config.ts</code> and <code>src/decks.ts</code>. Build input, public paths, and runtime policy live in this one config.</>}</p>
        <dl class="configuration-map">
          <div><dt><code>package.json</code></dt><dd>{isJa ? "ViteまたはWranglerを使う、普段の開発コマンドを定義します。" : "Runs the existing Vite or Wrangler development command."}</dd></div>
          <div><dt><code>hono-decks.config.ts</code></dt><dd>{isJa ? "CLIと実行時で共有する必須の設定ファイルです。" : "Required configuration shared by the CLI and runtime."}</dd></div>
          <div><dt><code>decks.ts</code></dt><dd>{isJa ? "生成物とアプリの設定を読み込み、ルーターを作成します。" : "A stable facade that combines the generated source, config, and call-site overrides."}</dd></div>
          <div><dt><code>generated/</code></dt><dd>{isJa ? "コンパイラーが生成するマニフェストとスライドのモジュールです。" : "Compiler-owned manifest and slide modules."}</dd></div>
        </dl>
        <Callout title={isJa ? "設定は1か所にまとめます" : "One config file"}><p>{isJa ? <>CLIは<code>build</code>を、実行時は<code>mountPath</code>と<code>router</code>を同じ設定ファイルから読み込みます。</> : <>The CLI reads <code>build</code>; runtime reads <code>mountPath</code> and <code>router</code> from the same config.</>}</p></Callout>
      </section>
      <section id="compile">
        <h2>{isJa ? "コンパイラーを開発フローに組み込む" : "Connect the compiler to the dev lifecycle"}</h2>
        <p>{isJa ? <>Viteでは<code>honoDecks()</code>を追加し、Wranglerではカスタムビルドに<code>hono-decks compile</code>を登録します。<code>build.root</code>、<code>build.outDir</code>、<code>mountPath</code>は共通の設定ファイルから読み込みます。</> : <>Add <code>honoDecks()</code> to Vite, or register <code>hono-decks compile</code> as a Wrangler custom build. The shared config supplies <code>build.root</code>, <code>build.outDir</code>, and <code>mountPath</code>.</>}</p>
        <CodeBlock label="vite.config.ts" code={viteDecksCode} locale={locale} />
        <CodeBlock label="package.json" code={buildScriptsCode} locale={locale} />
        <p>{isJa ? <>リンクカードのキャッシュ先は<code>build.ogpCacheFile</code>で指定します。保存済みデータを更新するときだけ<code>--refresh-ogp</code>を使います。</> : <>Set LinkCard cache at <code>build.ogpCacheFile</code>. Use <code>--refresh-ogp</code> only for an intentional refresh.</>}</p>
        <p><a class="text-link" href={localizedHref("/docs/recipes", locale)}>{isJa ? "OGP画像とPDF・PNG出力のレシピを見る" : "Open the OGP and file-export recipes"} →</a></p>
      </section>
      <section id="runtime">
        <h2>{isJa ? "リクエストごとに変わる値を設定する" : "Configure values that change per request"}</h2>
        <p>{isJa ? <><code>defineDecksConfig()</code>を使うと、HonoのBindingsとVariablesを含めて型を確認できます。<code>dev</code>を省略すると、ViteとWranglerが設定する<code>NODE_ENV</code>から判定します。標準設定では、<code>vite</code>と<code>wrangler dev</code>は開発モード、プロダクションビルドと<code>wrangler deploy</code>は本番モードになります。明示したbooleanまたは関数は自動判定より優先され、判定できない環境では本番モードになります。</> : <>Use <code>defineDecksConfig()</code> to preserve Hono Bindings and Variables types. When <code>dev</code> is omitted, hono-decks reads the <code>NODE_ENV</code> set by Vite and Wrangler. With their standard settings, <code>vite</code> and <code>wrangler dev</code> enable development mode, while production builds and <code>wrangler deploy</code> use production mode. An explicit boolean or resolver overrides detection, and unknown environments fail closed to production mode.</>}</p>
        <CodeBlock code={configCode} locale={locale} />
        <p>{isJa ? <><code>c.get("language")</code>を使う例では、Honoの<code>languageDetector()</code>を先に登録します。手順は<a class="text-link" href={localizedHref("/docs/security#language", locale)}>HTMLとセキュリティ</a>で確認できます。多言語対応が不要なら<code>lang: "ja"</code>のように固定値を指定します。</> : <>The <code>c.get("language")</code> example assumes Hono's <code>languageDetector()</code> is registered first; see <a class="text-link" href={localizedHref("/docs/security#language", locale)}>document policy and security</a>. For a single-language app, use a fixed value such as <code>lang: "en"</code>.</>}</p>
      </section>
      <section id="facade">
        <h2>{isJa ? "設定が上書きされる順序を確認する" : "Make precedence explicit in the facade"}</h2>
        <p>{isJa ? <>設定は、生成時の既定値、アプリの設定、<code>decks.router(overrides)</code>の順に適用されます。入れ子になった設定も<code>createDecks(config)</code>が結合します。</> : <>Generated defaults, app config, and <code>decks.router(overrides)</code> are applied in order; the configured kit merges nested options.</>}</p>
        <CodeBlock code={facadeCode} locale={locale} />
        <Callout title={isJa ? "公開パスは1か所で指定します" : "One mount path"}><p>{isJa ? <><code>mountPath</code>は設定ファイルに一度だけ書き、実行時は<code>decks.mountPath</code>を使います。</> : <>Write <code>mountPath</code> once in config and use <code>decks.mountPath</code> at runtime.</>}</p></Callout>
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

const recipes = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "OGP画像とファイル出力" : "OGP images and file export",
    description: isJa
      ? "Satoriによるビルド時のOGP画像生成と、Cloudflare Browser RunによるPDF・PNG出力を追加します。"
      : "Add build-time OGP image generation with Satori and PDF or PNG export with Cloudflare Browser Run.",
    sections: isJa
      ? [{ id: "ogp", label: "OGP画像生成" }, { id: "browser-export", label: "PDF・PNG出力" }]
      : [{ id: "ogp", label: "OGP images" }, { id: "browser-export", label: "PDF and PNG export" }],
    content: <>
      <section id="ogp">
        <h2>{isJa ? "SatoriでOGP画像をビルド時に保存する" : "Save OGP images at build time with Satori"}</h2>
        <p>{isJa ? <>Browser Renderingを使わず、<code>compileDecks()</code>が返すデッキ情報からSatoriでSVGを、resvgで1200×630のPNGを生成できます。画像生成はNode.js側のビルドスクリプトに置くため、Workerの実行時コードやhono-decks本体に依存を追加する必要はありません。</> : <>Generate an SVG with Satori and a 1200×630 PNG with resvg from the manifest returned by <code>compileDecks()</code>, without Browser Rendering. Keep image generation in a Node build script so neither the Worker runtime nor hono-decks core gains these dependencies.</>}</p>
        <CodeBlock label="hono-decks.config.ts" locale={locale} code={`export default defineDecksConfig({
  mountPath: "/decks",
  router: {
    viewer: { openGraph: true },
  },
})`} />
        <p>{isJa ? <><code>viewer.openGraph</code>を有効にすると、<code>decks.paths(slug).ogImage</code>（既定では<code>/decks/:slug/og.png</code>）の絶対URLを使ったOpen Graph / Twitter Cardタグを生成します。PNGはWrangler Static Assetsへ保存します。</> : <>Enabling <code>viewer.openGraph</code> emits absolute Open Graph and Twitter Card tags from <code>decks.paths(slug).ogImage</code>, which defaults to <code>/decks/:slug/og.png</code>. Save the PNG under Wrangler Static Assets.</>}</p>
        <Callout title={isJa ? "フォントをビルド対象に含める" : "Keep fonts in the build input"}><p>{isJa ? <>SatoriはTTF / OTF / WOFFを扱えますが、WOFF2には対応していません。日本語を描画する場合は、日本語の文字を含むフォントファイルを同梱し、そのディレクトリを<code>wrangler.jsonc</code>の<code>build.watch_dir</code>にも追加します。</> : <>Satori accepts TTF, OTF, and WOFF, but not WOFF2. Bundle a font that covers every rendered language and add its directory to <code>build.watch_dir</code> in <code>wrangler.jsonc</code>.</>}</p></Callout>
        <p><a class="text-link" href="https://github.com/ts-76/hono-slides/tree/main/examples/ogp">{isJa ? "Satori + resvgの実装例を見る" : "Open the complete Satori + resvg recipe"} →</a></p>
        <p>{isJa ? <><code>build.ogpCacheFile</code>はスライド内のリンクカード用キャッシュです。ビューアーのOGP画像とは別に管理されます。</> : <><code>build.ogpCacheFile</code> caches LinkCard metadata inside slides; it is unrelated to this viewer share image.</>}</p>
      </section>
      <section id="browser-export">
        <h2>{isJa ? "Browser RunでPDF / PNGを書き出す" : "Export PDF and PNG with Browser Run"}</h2>
        <p>{isJa ? <>Cloudflare Browser RunのQuick Actionsをブラウザバインディングから呼び、デッキの<code>print</code>画面をPDFまたはPNGとして返せます。<code>hono-decks</code>が<code>quickAction("pdf")</code>または<code>quickAction("screenshot")</code>を呼ぶため、Puppeteer、Playwright、Browser Run用のAPIトークンは不要です。</> : <>Use Cloudflare Browser Run Quick Actions through a browser binding to return the deck's <code>print</code> page as PDF or PNG. <code>hono-decks</code> calls <code>quickAction("pdf")</code> or <code>quickAction("screenshot")</code>, so this flow needs neither Puppeteer, Playwright, nor a Browser Run API token.</>}</p>
        <CodeBlock label="wrangler.jsonc" code={browserRunWranglerCode} locale={locale} />
        <Callout title={isJa ? "ローカル開発ではリモートバインディングを使う" : "Use a remote binding during local development"}><p>{isJa ? <><code>quickAction()</code>には<code>2026-03-24</code>以降のcompatibility dateが必要です。ローカルモードでは未対応のため、バインディングに<code>remote: true</code>を設定するか、<code>wrangler dev --remote</code>で起動します。</> : <><code>quickAction()</code> requires a compatibility date of <code>2026-03-24</code> or later. Local mode does not support it yet, so set <code>remote: true</code> on the binding or start with <code>wrangler dev --remote</code>.</>}</p></Callout>
        <p>{isJa ? <>次の例では、先に登録したセッションまたはCloudflare Access検証ミドルウェアが<code>deckExportAllowed</code>を設定済みとします。</> : <>The next example assumes an earlier session or Cloudflare Access validation middleware has set <code>deckExportAllowed</code>.</>}</p>
        <CodeBlock label="hono-decks.config.ts" code={browserRunConfigCode} locale={locale} />
        <RouteTable locale={locale} rows={[
          ["/:slug/print", isJa ? "全スライドを並べるBrowser Runの入力画面" : "All-slide document used as Browser Run input"],
          ["/:slug/export.pdf", isJa ? "print画面をPDFとしてダウンロード" : "Download the print document as PDF"],
          ["/:slug/export.png", isJa ? "print画面全体をPNGとしてダウンロード" : "Download a full-page PNG of the print document"],
        ]} />
        <p>{isJa ? <>出力リクエストが<code>authorize</code>を通過すると、公開オリジン上の<code>print</code> URLをバインディングへ渡し、返されたファイルを添付ファイルとして応答します。ビューアーの出力ボタンも、同じ認可を通過したリクエストにだけ表示されます。</> : <>After <code>authorize</code> succeeds, the export request sends the public <code>print</code> URL to the binding and returns its file as an attachment. Viewer export controls are shown only on requests that pass the same authorization.</>}</p>
        <Callout title={isJa ? "authorizeはPDF・PNG出力だけを制御します" : "authorize only controls PDF and PNG export"}><p>{isJa ? <><code>authorize</code>の対象は<code>/:slug/export.pdf</code>、<code>/:slug/export.png</code>と、対応するビューアー上の出力ボタンです。ビューアー、発表画面、発表者画面、<code>print</code>画面の公開範囲は変わりません。<code>authorize: () =&gt; true</code>では誰でもファイルを書き出せます。省略した場合も同じく公開されるため、公開する場合も明示を推奨します。利用者を制限する場合は、既存のセッションやAccess検証の結果を返します。</> : <><code>authorize</code> applies to <code>/:slug/export.pdf</code>, <code>/:slug/export.png</code>, and their viewer controls. It does not protect the viewer, presentation, presenter, or <code>print</code> routes. <code>authorize: () =&gt; true</code> lets anyone export a file. Omitting it has the same public behavior, so an explicit setting is recommended. To restrict exports, return the result of existing session or Access validation.</>}</p></Callout>
        <p>{isJa ? <>Bearerトークンを使う場合は<code>vars</code>へ直書きせず、Wranglerのsecretで管理します。</> : <>Store bearer tokens as Wrangler secrets rather than plain <code>vars</code> values.</>}</p>
        <p><a class="text-link" href="https://developers.cloudflare.com/browser-run/quick-actions/">{isJa ? "Cloudflare Browser Run Quick Actionsを確認する" : "Read the Cloudflare Browser Run Quick Actions docs"} →</a></p>
        <p><a class="text-link" href="https://github.com/ts-76/hono-slides/tree/main/examples/basic">{isJa ? "Browser Runを組み込んだサンプルを見る" : "Open the example with Browser Run configured"} →</a></p>
      </section>
    </>,
  };
};

const security = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "HTMLの共通設定とセキュリティ" : "Document policy and security",
    description: isJa ? "Honoアプリとhono-decksの役割を分け、言語、CSP、外部iframeの設定を各画面へ適用します。" : "Separate application and hono-decks responsibilities, then apply language, CSP, and iframe policy to every surface.",
    sections: isJa ? [{ id: "defaults", label: "公開ルート" }, { id: "language", label: "言語" }, { id: "csp", label: "CSPとnonce" }, { id: "embed", label: "外部サイトへの埋め込み" }, { id: "check", label: "公開前の確認" }] : [{ id: "defaults", label: "Public routes" }, { id: "language", label: "Language" }, { id: "csp", label: "CSP and nonce" }, { id: "embed", label: "External embeds" }, { id: "check", label: "Pre-release checks" }],
    content: <>
      <section id="defaults"><h2>{isJa ? "標準で作成されるルートを確認する" : "Review the routes created by default"}</h2><p>{isJa ? <>標準では、一覧、ビューアー、スライド本体、発表画面、発表者画面、印刷画面が作成されます。これらのルートにhono-decks独自の認証は付きません。外部iframe用の<code>/:slug/embed</code>だけは、<code>embed</code>を指定するまで作成されません。不要な画面は<code>router.pages</code>で無効にしてください。</> : <>By default, the router creates the index, viewer, slide document, presentation, presenter, and print routes. hono-decks does not add authentication to those routes. Only the external <code>/:slug/embed</code> route is opt-in. Disable unused surfaces through <code>router.pages</code>.</>}</p><p>{isJa ? <>認証、認可、CSPヘッダーはHonoアプリが担当します。hono-decksは、アプリから渡された言語やnonceを生成するHTMLへ反映します。</> : <>The Hono application owns authentication, authorization, and CSP headers. hono-decks applies the resolved language and nonce to the HTML it generates.</>}</p></section>
      <section id="language"><h2>{isJa ? "Honoで言語を判定し、すべての画面へ渡す" : "Detect language in Hono and pass it to every surface"}</h2><p>{isJa ? <>Honoの<code>languageDetector()</code>は、既定でクエリ、Cookie、<code>Accept-Language</code>の順に言語を判定し、<code>c.get("language")</code>から取得できるようにします。</> : <>Hono's <code>languageDetector()</code> checks query, cookie, then <code>Accept-Language</code> by default and exposes the result through <code>c.get("language")</code>.</>}</p><CodeBlock locale={locale} code={languageMiddlewareCode} /><p>{isJa ? <><code>document.lang</code>にその値を渡すと、一覧、ビューアー、スライド、印刷、発表画面、発表者画面の<code>&lt;html lang&gt;</code>が揃います。</> : <>Pass that value to <code>document.lang</code> so index, viewer, render, print, presentation, and presenter all receive the same <code>&lt;html lang&gt;</code>.</>}</p></section>
      <section id="csp"><h2>{isJa ? "同じnonceをCSPヘッダーとHTMLへ渡す" : "Use the same nonce in the CSP header and generated HTML"}</h2><p>{isJa ? <>nonceはリクエストごとに作り、HonoのVariablesへ保存します。CSPヘッダーに含めた値と、<code>document.nonce</code>が返す値は必ず同じにします。</> : <>Create one nonce per request and store it in Hono Variables. The value in the CSP header must match the value returned by <code>document.nonce</code>.</>}</p><CodeBlock label={isJa ? "アプリ側のミドルウェア" : "Application middleware"} locale={locale} code={nonceMiddlewareCode} /><CodeBlock label={isJa ? "hono-decksの設定" : "hono-decks configuration"} locale={locale} code={documentPolicyCode} /><p>{isJa ? <>hono-decksは指定されたnonceを、パッケージが生成する<code>&lt;style&gt;</code>と<code>&lt;script&gt;</code>へ付けます。YouTube、外部画像、Islandなどを使う場合は、アプリ側のCSPにも必要な配信元を追加してください。</> : <>hono-decks adds the nonce to package-generated <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> elements. Add required origins to the application CSP when using YouTube, remote images, or islands.</>}</p></section>
      <section id="embed"><h2>{isJa ? "埋め込みを許可するオリジンを指定する" : "Allow explicit embedding origins"}</h2><p>{isJa ? <>外部サイトにiframeで表示するときだけ<code>embed</code>を有効にし、親ページのオリジンを列挙します。</> : <>Enable <code>embed</code> only for external iframes and list allowed parent origins.</>}</p><CodeBlock locale={locale} code={`decks.router({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    document: { nonce: ({ c }) => c.get("cspNonce") },
    viewer: { controls: false },
  },
})`} /><Callout title={isJa ? "許可先を省略した場合" : "When origins are omitted"}><p>{isJa ? <><code>frame-ancestors 'self'</code>が適用され、別オリジンからは埋め込めません。埋め込み用ページでは、設定したCSPに合わせて<code>X-Frame-Options</code>が取り除かれます。</> : <><code>frame-ancestors 'self'</code> applies, so another origin cannot embed the page. The embed response removes <code>X-Frame-Options</code> to let the configured CSP control framing.</>}</p></Callout></section>
      <section id="check"><h2>{isJa ? "公開前に実際のレスポンスを確認する" : "Inspect real responses before release"}</h2><dl class="troubleshooting-list"><div><dt>{isJa ? "下書きや発表者画面" : "Drafts and presenter"}</dt><dd>{isJa ? "本番で不要なルートが404になることを確認します。" : "Confirm routes that should stay private return 404 in production."}</dd></div><div><dt>CSP</dt><dd>{isJa ? "ブラウザの開発者ツールでCSP違反がなく、nonceがヘッダーとHTMLで一致することを確認します。" : "Check the browser console for CSP violations and confirm header and HTML nonces match."}</dd></div><div><dt>{isJa ? "外部埋め込み" : "External embed"}</dt><dd>{isJa ? "許可した親サイトでは表示でき、許可していないオリジンでは拒否されることを確認します。" : "Verify the allowed parent loads and an unlisted origin is rejected."}</dd></div></dl><p><a class="text-link" href={localizedHref("/api#deck-document-options", locale)}>{isJa ? "HTMLと埋め込みのAPIを見る" : "Open the Document and Embed API"} →</a></p></section>
    </>,
  };
};

export function getGuide(slug: string, locale: Locale): Guide | undefined {
  const factories: Record<string, (locale: Locale) => Guide> = { "getting-started": gettingStarted, authoring, configuration, recipes, routing, security };
  return factories[slug]?.(locale);
}
