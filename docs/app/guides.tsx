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

const expectedFiles = (locale: Locale) => locale === "ja" ? `decks/
└── sample/
    └── deck.mdx
src/
├── decks.ts              # アプリ側で編集
└── generated/
    └── decks.ts          # 自動生成。編集しない` : `decks/
└── sample/
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
import type { AppEnv } from "./env"

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  router: {
    dev: (c) => c.env.ENVIRONMENT !== "production",
    document: {
      lang: ({ c }) => c.req.header("accept-language")?.startsWith("en") ? "en" : "ja",
    },
    presenter: {
      enabled: ({ c, dev }) => dev || c.env.PRESENTER_ENABLED === "true",
    },
    pages: {
      print: ({ c }) => c.env.PRINT_ENABLED === "true",
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

const gettingStarted = (locale: Locale): Guide => locale === "ja" ? {
  title: "導入",
  description: "MDXのスライドをコンパイルし、生成されたルーターを既存のHonoアプリに組み込みます。",
  sections: [
    { id: "prerequisites", label: "必要なもの" },
    { id: "install", label: "インストールと生成" },
    { id: "mount", label: "ルーターの登録" },
    { id: "verify", label: "表示を確認" },
    { id: "troubleshooting", label: "困ったとき" },
    { id: "next", label: "次に読む" },
  ],
  content: <>
    <section id="prerequisites">
      <h2>必要なもの</h2>
      <p>Bun 1.2以降とHono 4のアプリを用意します。hono-decksは既存のアプリへルートを追加するため、別のサーバーや実行環境は必要ありません。</p>
      <Callout title="処理の分担"><p>MDXのコンパイルはNode.jsまたはBunで行います。生成されたルートはCloudflare Workersを含むHonoの実行環境で動作します。</p></Callout>
    </section>
    <section id="install">
      <h2>インストールしてスライドを生成する</h2>
      <p>まず<code>decks.ts</code>を作成し、<code>decks/</code>にあるMDXをWorkerで使えるモジュールへ変換します。</p>
      <CodeBlock label="Terminal" code={installCode} locale={locale} />
      <p><code>src/decks.ts</code>はアプリ側で編集できます。<code>src/generated/decks.ts</code>はコンパイルのたびに更新されるため、直接編集しないでください。</p>
      <CodeBlock label="Generated files" code={expectedFiles(locale)} locale={locale} />
    </section>
    <section id="mount">
      <h2>ルーターを登録する</h2>
      <CodeBlock code={mountCode} locale={locale} />
      <p>コンパイル時の<code>--mount /decks</code>と<code>app.route("/decks", …)</code>には、同じパスを指定します。</p>
    </section>
    <section id="verify">
      <h2>ブラウザで表示を確認する</h2>
      <CodeBlock label="Terminal" code={`bun run dev`} locale={locale} />
      <p>開発サーバーが表示したURLの<code>/decks</code>を開きます。一覧に<strong>sample</strong>が表示され、ビューアー、発表画面、発表者画面を開ければ設定は完了です。</p>
      <Callout title="URLの例"><p><code>http://localhost:3000/decks</code>。別のポートが表示された場合は、開発サーバーのURLを使ってください。</p></Callout>
    </section>
    <section id="troubleshooting">
      <h2>うまくいかないとき</h2>
      <dl class="troubleshooting-list">
        <div><dt><code>src/generated/decks.ts</code>がない</dt><dd><code>bunx hono-decks compile</code>を再実行し、<code>--root</code>がデッキのディレクトリを指しているか確認します。</dd></div>
        <div><dt><code>/decks</code>が404になる</dt><dd>コンパイルと<code>app.route()</code>に指定したパスをそろえ、<code>decks.ts</code>の読み込み先を確認します。</dd></div>
        <div><dt>WorkerのビルドにNode.js用モジュールが含まれる</dt><dd>実行時APIは<code>hono-decks</code>から読み込みます。<code>hono-decks/node</code>はコンパイル用スクリプトだけで使用してください。</dd></div>
      </dl>
    </section>
    <section id="next">
      <h2>次に読む</h2>
      <p><a class="text-link" href={localizedHref("/docs/authoring", locale)}>MDXでスライドを書く →</a></p>
      <p><a class="text-link" href={localizedHref("/docs/configuration", locale)}>設定ファイルを追加する →</a></p>
      <p><a class="text-link" href={localizedHref("/docs/routing", locale)}>ルートとUIを設定する →</a></p>
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
    <section id="install"><h2>Install, initialize, and compile</h2><p>Generate the app-owned facade, then compile MDX from <code>decks/</code> into Worker-safe modules.</p><CodeBlock label="Terminal" code={installCode} locale={locale} /><p>The result has a clear boundary: edit <code>src/decks.ts</code>, but let the compiler own <code>src/generated/decks.ts</code>.</p><CodeBlock label="Generated files" code={expectedFiles(locale)} locale={locale} /></section>
    <section id="mount"><h2>Mount the router</h2><CodeBlock code={mountCode} locale={locale} /><p>Keep the compile-time <code>--mount /decks</code> path aligned with <code>app.route("/decks", …)</code>.</p></section>
    <section id="verify"><h2>Verify it in the browser</h2><CodeBlock label="Terminal" code="bun run dev" locale={locale} /><p>Open <code>/decks</code> on the local URL printed by your dev server. You should see <strong>sample</strong> in the deck index and be able to open its viewer, presentation, and presenter surfaces.</p><Callout title="Expected URL"><p><code>http://localhost:3000/decks</code>. If your dev server selects another port, use the printed URL.</p></Callout></section>
    <section id="troubleshooting"><h2>Troubleshooting</h2><dl class="troubleshooting-list"><div><dt>Missing <code>src/generated/decks.ts</code></dt><dd>Run <code>bunx hono-decks compile</code> again and confirm that <code>--root</code> points at the deck directory.</dd></div><div><dt><code>/decks</code> returns 404</dt><dd>Align the compile and <code>app.route()</code> mount paths, then check the facade import.</dd></div><div><dt>Node modules enter the Worker bundle</dt><dd>Import runtime APIs from <code>hono-decks</code>. Keep <code>hono-decks/node</code> in build scripts only.</dd></div></dl></section>
    <section id="next"><h2>Choose the next step</h2><p><a class="text-link" href={localizedHref("/docs/authoring", locale)}>Author MDX and components →</a></p><p><a class="text-link" href={localizedHref("/docs/configuration", locale)}>Configure the application boundary →</a></p><p><a class="text-link" href={localizedHref("/docs/routing", locale)}>Integrate routes and UI →</a></p><DeployToCloudflare locale={locale} /></section>
  </>,
};

const authoring = (locale: Locale): Guide => locale === "ja" ? {
  title: "MDXでスライドを書く",
  description: "フロントマター、スライドの区切り、コンポーネント、画像などの書き方を説明します。",
  sections: [{ id: "structure", label: "デッキの構成" }, { id: "components", label: "コンポーネント" }, { id: "assets", label: "アセットと埋め込み" }],
  content: <>
    <section id="structure"><h2>デッキごとにディレクトリを作る</h2><p>基本のファイル構成は<code>decks/&lt;slug&gt;/deck.mdx</code>です。ファイルの先頭にデッキ全体のフロントマターを書き、<code>---</code>でスライドを区切ります。</p><CodeBlock label="MDX" locale={locale} code={`---
title: Hono at the edge
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`} /></section>
    <section id="components"><h2>コンポーネントとIsland</h2><p><code>components/index.tsx</code>の名前付きエクスポートはサーバーコンポーネントとして使われます。<code>components/client/index.tsx</code>のコンポーネントはIslandとして生成されます。登録先はデッキごとに分かれます。</p><CodeBlock locale={locale} code={`// decks/launch/components/index.tsx
export function Metric(props: { value: string; label: string }) {
  return <figure><strong>{props.value}</strong><figcaption>{props.label}</figcaption></figure>
}`} /></section>
    <section id="assets"><h2>画像と外部コンテンツ</h2><p>相対パスで指定した画像は、生成時に配信用URLへ変換されます。R2から配信する場合は<code>withR2Assets()</code>を使います。</p><CodeBlock label="MDX" locale={locale} code={`![Architecture](./assets/runtime-boundary.svg)

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
    title: isJa ? "ルートとUIを組み込む" : "Integrate routes and UI",
    description: isJa ? "ビューアー、発表画面、発表者画面、出力機能のルートと、リクエストに応じた設定方法を説明します。" : "Understand viewer, projection, presenter, and export responsibilities, then extend them with request context.",
    sections: isJa ? [{ id: "surfaces", label: "標準ルート" }, { id: "request-context", label: "リクエスト別の設定" }, { id: "extensions", label: "画面のカスタマイズ" }] : [{ id: "surfaces", label: "Route surfaces" }, { id: "request-context", label: "Request context" }, { id: "extensions", label: "Pages and extensions" }],
    content: <>
      <section id="surfaces"><h2>{isJa ? "標準で用意されるルート" : "Default route surfaces"}</h2><RouteTable locale={locale} rows={[["/", isJa ? "公開デッキの一覧" : "Public deck index"], ["/:slug", isJa ? "ビューアー" : "Outer viewer and controls"], ["/:slug/render", isJa ? "iframe内に表示するスライド" : "Slide runtime iframe"], ["/:slug/presentation", isJa ? "発表画面" : "Projection window"], ["/:slug/presenter", isJa ? "発表者画面" : "Speaker view"], ["/:slug/print", isJa ? "印刷用画面" : "Print preview"]]} /></section>
      <section id="request-context"><h2>{isJa ? "リクエストに応じて設定を変える" : "Resolve options from request context"}</h2><p>{isJa ? <><code>dev</code>は開発サーバーから自動では設定されません。真偽値を渡すか、Honoのコンテキストから値を返す関数を指定します。</> : <><code>dev</code> is not inferred from the dev server. Pass a boolean or resolver explicitly as a router option.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  dev: (c) => c.env.ENVIRONMENT !== "production",
  presenter: {
    enabled: ({ c, deck }) => deck.meta.presenter === true && Boolean(c.env.PRESENTER_ENABLED),
    viewerControl: true,
  },
})`} /></section>
      <section id="extensions"><h2>{isJa ? "画面を差し替える・ルートを追加する" : "Custom pages and extensions"}</h2><p>{isJa ? <><code>deckContext()</code>を使うと、アプリ側のルートからコンパイル済みデッキ、ビューアーの部品、目次、メタデータを参照できます。ルーター内へ別のHonoアプリを追加する場合は<code>extensions</code>を使います。</> : <><code>deckContext()</code> gives app-owned routes the compiled deck, viewer parts, TOC, and metadata. Use <code>extensions</code> to mount another Hono app inside the router.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  pages: {
    index: {
      title: ({ decks }) => String(decks.length) + " decks",
      render: ({ title, defaultContent }) => <main><h1>{title}</h1>{defaultContent}</main>,
    },
    print: false,
  },
})`} /><Callout title={isJa ? "スライド位置を表すURL" : "URL state"}><p>{isJa ? <>ビューアー、発表画面、発表者画面は<code>?slide=2&amp;step=1</code>を共通して使います。</> : <>Viewer, presentation, and presenter share <code>?slide=2&amp;step=1</code>.</>}</p></Callout></section>
    </>,
  };
};

const configuration = (locale: Locale): Guide => {
  const isJa = locale === "ja";
  return {
    title: isJa ? "設定ファイル" : "Configuration",
    description: isJa
      ? "コンパイル時の指定、decks.config.ts、ルーター設定の役割と優先順位を説明します。"
      : "Separate compile-time inputs, the app-owned decks.config.ts file, and request-aware router options.",
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
        <h2>{isJa ? <><span class="line-unit">生成時と実行時で</span><wbr /><span class="line-unit">設定を分ける</span></> : "Split configuration across two timelines"}</h2>
        <p>{isJa ? <>CLIオプションではMDXの読み込み元や出力先を指定します。<code>src/decks.config.ts</code>では、生成済みのデッキをリクエストごとにどう配信するかを設定します。<code>src/generated/</code>は直接編集しません。</> : <>CLI options decide how MDX is generated. <code>src/decks.config.ts</code> decides how compiled decks are exposed at request time. Never edit <code>src/generated/</code> directly.</>}</p>
        <dl class="configuration-map">
          <div><dt><code>package.json</code></dt><dd>{isJa ? "デッキの読み込み元、出力先、公開パスをコンパイルコマンドに指定します。" : "Pins the compile root, output directory, and mount path."}</dd></div>
          <div><dt><code>decks.config.ts</code></dt><dd>{isJa ? "アプリ側で管理する任意の設定ファイルです。データの取得元やルーターの設定をまとめます。" : "Optional app-owned configuration that connects the source and router options to your environment."}</dd></div>
          <div><dt><code>decks.ts</code></dt><dd>{isJa ? "生成物とアプリの設定を読み込み、ルーターを作成します。" : "A stable facade that combines the generated source, config, and call-site overrides."}</dd></div>
          <div><dt><code>generated/</code></dt><dd>{isJa ? "コンパイラーが生成するマニフェストとスライドのモジュールです。" : "Compiler-owned manifest and slide modules."}</dd></div>
        </dl>
        <Callout title={isJa ? "設定ファイルは必要になってから追加する" : "The config file is optional"}><p>{isJa ? <><code>hono-decks init</code>が作る<code>decks.ts</code>だけでも動作します。環境変数、R2、CSP、出力機能、独自UIなどを設定するときに<code>decks.config.ts</code>を追加してください。</> : <>The <code>decks.ts</code> facade generated by <code>hono-decks init</code> works on its own. Split out a config file when you need environment bindings, R2, CSP, exports, or custom UI.</>}</p></Callout>
      </section>
      <section id="compile">
        <h2>{isJa ? "コンパイル設定をスクリプトに書く" : "Pin compile settings in scripts"}</h2>
        <p>{isJa ? <><code>--root</code>と<code>--out</code>は必須です。<code>--mount</code>は画像などのURLの基準になるため、Honoの<code>app.route()</code>と同じパスにします。</> : <><code>--root</code> and <code>--out</code> are required. <code>--mount</code> becomes the base for asset URLs, so keep it aligned with the Hono <code>app.route()</code> path.</>}</p>
        <CodeBlock label="package.json" code={buildScriptsCode} locale={locale} />
        <p>{isJa ? <><code>--ogp-cache</code>を指定するとLinkCardのメタデータを保存できます。<code>--refresh-ogp</code>は、保存済みデータをネットワークから更新するときに使います。</> : <><code>--ogp-cache</code> makes LinkCard metadata reproducible. Use <code>--refresh-ogp</code> only when intentionally refreshing it from the network.</>}</p>
      </section>
      <section id="runtime">
        <h2>{isJa ? <><span class="line-unit">リクエストごとに</span><wbr /><span class="line-unit">変わる値を設定する</span></> : "Keep request-aware values in config"}</h2>
        <p>{isJa ? <><code>defineDecksConfig()</code>を使うと、実行時設定の型を確認できます。<code>dev</code>は開発サーバーから自動では設定されないため、環境変数やHonoのコンテキストから値を返してください。</> : <>Use <code>defineDecksConfig()</code> to preserve runtime types. <code>dev</code> is never inferred from the dev server; resolve it explicitly from bindings or request context.</>}</p>
        <CodeBlock code={configCode} locale={locale} />
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
    description: isJa ? "各画面の言語、CSPのnonce、head要素をリクエストに応じて設定します。" : "Apply request-scoped language, CSP nonces, and head customization across every HTML surface.",
    sections: isJa ? [{ id: "policy", label: "HTMLの共通設定" }, { id: "csp", label: "CSPとnonce" }, { id: "embed", label: "外部サイトへの埋め込み" }] : [{ id: "policy", label: "Shared policy" }, { id: "csp", label: "CSP and nonce" }, { id: "embed", label: "External embeds" }],
    content: <>
      <section id="policy"><h2>{isJa ? "HTMLの設定を画面間で共有する" : "One shared document policy"}</h2><p>{isJa ? <><code>document</code>の設定は、一覧、ビューアー、スライド表示、印刷、発表画面、発表者画面に共通して適用されます。値を返す関数を指定すれば、リクエストごとに設定を変えられます。画面ごとの差分は<code>surfaces</code>に指定します。</> : <><code>document</code> applies to index, viewer, render, print, presentation, and presenter. Values can be request-aware resolvers, with per-surface overrides.</>}</p></section>
      <section id="csp"><h2>{isJa ? "CSPのnonceを付ける" : "Strict CSP and nonces"}</h2><CodeBlock locale={locale} code={`createDecksRouter({
  document: {
    lang: ({ c }) => c.req.header("accept-language")?.startsWith("en") ? "en" : "ja",
    nonce: ({ c }) => c.get("secureHeadersNonce"),
    head: ({ surface }) => <meta name="hono-decks-surface" content={surface} />,
    surfaces: { presenter: { lang: "en" } },
  },
})`} /><p>{isJa ? <>指定したnonceは、hono-decksが生成するすべての<code>&lt;style&gt;</code>と<code>&lt;script&gt;</code>に付与されます。CSPヘッダーはアプリのミドルウェアで設定してください。</> : <>The resolved nonce is added to every package-generated inline <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code>. Configure the CSP header in app middleware.</>}</p></section>
      <section id="embed"><h2>{isJa ? "外部サイトへ埋め込む" : "External iframe embeds"}</h2><p>{isJa ? <>ルーターの<code>embed</code>設定で、埋め込み用ページ、ビューアーのサイズ、CSPの<code>frame-ancestors</code>をまとめて指定できます。埋め込み用ページでは<code>X-Frame-Options</code>も取り除かれます。</> : <>The router <code>embed</code> option coordinates the embed document, viewer sizing, CSP <code>frame-ancestors</code>, and removal of <code>X-Frame-Options</code>.</>}</p><CodeBlock locale={locale} code={`createDecksRouter({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    document: { nonce: ({ c }) => c.get("secureHeadersNonce") },
    viewer: { controls: false },
  },
})`} /><Callout title={isJa ? "既定では同じオリジンだけ" : "Safe default"}><p>{isJa ? <><code>embed</code>は明示的に有効にする必要があります。許可するオリジンを省略した場合、<code>frame-ancestors 'self'</code>が適用され、外部サイトからは埋め込めません。</> : <><code>embed</code> is opt-in. Without allowed origins, it never expands beyond <code>frame-ancestors 'self'</code>.</>}</p></Callout></section>
    </>,
  };
};

export function getGuide(slug: string, locale: Locale): Guide | undefined {
  const factories: Record<string, (locale: Locale) => Guide> = { "getting-started": gettingStarted, authoring, configuration, routing, security };
  return factories[slug]?.(locale);
}
