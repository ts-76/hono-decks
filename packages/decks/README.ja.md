# hono-decks

[English](https://github.com/ts-76/hono-decks/blob/main/packages/decks/README.md) | 日本語

Hono と Cloudflare Workers 上で MDX のスライドを配信するためのライブラリです。ビルド時に MDX を TypeScript module へ変換し、Worker runtime ではファイルシステムや compiler を読み込みません。

## Hono＋Vite／HonoX：init で接続する

既存のアプリに `hono-decks` をインストールし、構成に合わせて初期設定します。

```sh
npm install hono-decks@latest

# Hono＋Vite
npx hono-decks init --framework hono

# HonoX の場合はこちら
npx hono-decks init --framework honox

# 以後は既存のコマンドを使う
npm run dev
npm run build
```

新規導入では`@latest`で現在の公開版を選びます。同じ環境を再現する場合は、動作確認したバージョンを明示してください。

どちらも、既存の Vite 設定を保持して自動コンパイルを登録し、
`hono-decks.config.ts`、`src/decks.ts`、サンプルの
`decks/welcome/deck.mdx` を作ります。生成ファイルがない状態からでも
通常の `dev`／`build` だけで動き、手動 `compile` やビルドコマンドの変更は不要です。
生成コードは Vite の仮想モジュールとして扱い、ファイルへ出力しません。Void 用のアダプターは必要ありません。

| 構成 | アプリへの接続 |
| --- | --- |
| `--framework hono` | 既存の Hono エントリーにルーターを追加。既存のミドルウェアとルートを保持 |
| `--framework honox` | `createApp()` に設定連動のルートを追加。既存のオプション、ページ、ミドルウェアを保持 |

公開先は `/slides/welcome` です。同名の既存デッキがあれば、サンプルには
空いている名前を選びます。既存の `.mdx`、コンポーネント、画像はそのまま使えます。

Hono では、`src/index.ts`／`.tsx`／`.js`／`.mts`／`.mjs` または
`src/app.ts`／`.tsx`／`.js` の候補が1つなら自動検出します。
独自の場所にある場合や複数の候補がある場合は、
`--entry src/server.ts` のように指定してください。
自動接続は `const app = new Hono()` で作ったアプリを default export する形式に対応します。
先行する catch-all／動的ルートなど、安全に接続できない構成ではファイルを変更せず、
手動接続の案内を表示します。

HonoX は標準の `app/routes` と、`app/server.ts` で `createApp()` を default export
する構成に対応します。`init` は `src/honox-decks.ts` を作り、既存の
`createApp()` オプションを包みます。HonoX の公開 `ROUTES` API に設定から
ルートを追加するため、**公開パスは `mountPath` 一か所の変更で切り替わります**。
ルート用ディレクトリを作成・改名する必要はありません。既存ルートと重なる場合はエラーにします。
開発中の公開パス変更では、コンパイル後に Vite を自動で再起動してルートを切り替えます。
生成する HonoX 接続ファイルには、`import.meta.glob` によるルート探索と
`hono-decks/honox` の `withHonoXDecks()` 呼び出しだけを置きます。
ルートの合成と衝突検査はパッケージが担当し、動的ルートや catch-all との衝突も検出します。
この処理の修正は、アプリ側を再生成せずパッケージ更新で受け取れます。
`createApp()` のオプション、ミドルウェア、明示的な `ROUTES` は保持します。
`--config config/slides.ts` で設定ファイルの場所を変えることもできます。

## Void：通常の dev／build で使う

既存の Void アプリに hono-decks と対応する Hono Markdown アダプターを
インストールし、初回だけ `init` を実行します。

```sh
npx hono-decks init --framework void --install
npm run dev
# 本番用のビルド
npm run build
```

この連携には standalone compiler／client export を持つアダプターが必要です。
新規インストールの既定値は `void-plugin-hono-jsx@^0.9.1` です。
`--install` は、インストール済みの互換アダプターを維持します。
`--install` を省略する場合は、Markdown 用の任意 peer も必要です：
`yaml@^2.9.1 shiki@^4.5.0 @shikijs/transformers@^4.5.0`。

新しい導入では `@ts-76/hono-markdown` 0.2.1以降がパーサー2パッケージを自動導入します。利用者側で `markdown-exit`・`markdown-it-container` を追加する必要はありません。既存Void 1.1用の0.6アダプターでは従来のpeer依存をinitが補完します。
動作確認した組み合わせは Node >=24.22.1 <25、Void 1.2.1、Vite 8.3.4、Hono 4.13.13 です。既存のVoid 1.1.11アプリでは互換性のある0.6アダプターを維持し、未導入の場合も0.6を選択します。0.9.1では[Void／Cloudflare依存の既知リスク](https://github.com/ts-76/void-plugin-hono-jsx/blob/v0.9.1/docs/dependency-security.md)が残ります。

`--install` は npm／pnpm／Yarn／Bun を packageManager または lockfile から判定し、
不足する依存だけを追加します。互換性のない既存バージョンは自動更新せずエラーにします。
Yarn は node_modules linker を対象とし、PnP は手動インストールを使ってください。
依存を自分で管理する場合は `--install` を省略できます。ローカルでビルドしたアダプターは
`--adapter /absolute/path/void-plugin-hono-jsx.tgz` で指定できます。
アプリ設定の衝突はインストール前に検査し、インストール失敗時は接続ファイルを作りません。
パッケージマネージャーによる依存・lockfileの変更は残る場合があります。

`init --framework void` は、既存のルート `vite.config.*` の default export を
`withHonoDecks()` で包み、次のファイルを作ります。

- `hono-decks.config.ts`：公開パス `/slides`、入力先 `decks`、Hono Markdown の有効化
- `src/decks.ts`：アプリ側で編集できる接続ファイル
- `middleware/hono-decks.ts`：スライド配下のルーティング、Markdown の CSS、開発時の自動更新
- `decks/welcome/deck.md` と `Counter.tsx`：`/slides/welcome` で開ける対話可能なサンプル

既存の `welcome` デッキがある場合は、`welcome-2` などの空いている名前を選び、
URL を表示します。既存の Markdown／MDX はそのまま保持します。

サンプルを編集するか、`decks` に `.md`／`.mdx` を追加してください。
既存の Vite の `dev`／`build` が自動でコンパイルします。生成ファイルが
ない状態から起動する場合も、手動 `compile`、別の監視プロセス、
`package.json` のコマンド変更は不要です。Vite が生成コードをメモリ上で扱うため、
生成用ディレクトリや、その `.gitignore` 登録も不要です。
既存の Void のエントリー、ルート、package scripts は保持します。
公開パスは既存ルートと重ならないものを選び、必要に応じてアプリのアクセス制御を適用してください。

書き込み前に依存パッケージと出力先の衝突を確認します。既存の接続ファイルは
上書きせず、hono-decks の二重登録も行いません。ESM の default export で
設定を返すオブジェクト、式、非同期関数に対応します。対応できない設定では
ファイルを変更せず、`honoDecks()` を手動で登録する方法を表示します。
`--config config/slides.ts` で設定ファイルの場所を変更できます。
`--out`／`--generated` は、以下の汎用 init 向けのオプションです。

## Markdown 内のクライアントコンポーネント

Hono Markdown では、別の登録ファイルを作らず、本文の import から自動登録できます。

```md
<script>
import Counter from "./Counter.tsx" with { island: "load" };
</script>
---
title: Interactive slide
---
# デモ

<Counter label="Count" initial="2" />
```

`Counter.tsx` は Hono JSX の default export です。`hono/jsx` の `useState` を使えます。
island はサーバーで初期描画し、`load`／`visible`／`idle`／`media:(query)` の条件で
ブラウザー上で動かします。`visible` はスライドがアクティブになってから監視します。
CSS import はコンパイル時に回収し、SSR・印刷ページにも含めます。
`useFrontmatter()` と `useMarkdownHeadings()` は各スライドの情報を返します。
クライアントへ渡すメタデータに秘密情報を含めないでください。

対応範囲は相対 TSX／JSX の default import と、文字列・真偽値のリテラル属性です。
JSX 式、island タグの子要素、任意の script コードは未対応です。
静的な部品は引き続き `with { component: "static" }` を使います。
既存 MDX のクライアントコンポーネント登録方法は変わりません。

## Vite の生成物と型チェック

Hono＋Vite／HonoX／Void は、共通の `virtual:hono-decks` を入口にします。
`init` が作る `src/decks.ts` は、この仮想モジュールへ接続します。

```ts
/// <reference types="hono-decks/vite-env" />
import { decks } from "virtual:hono-decks";

export { decks };
```

`decks` は `hono-decks.config.ts` を適用したコレクションです。
`decks.router()`、`decks.paths()` などの API は従来どおり使えます。
仮想モジュールには必要に応じて設定を適用する `createDecks(config)` もあります。
型定義はパッケージに同梱しているため、初回の `dev`／`build` 前でも型チェックできます。

通常は `decks/` の原稿・画像・部品と設定ファイルを編集します。
Vite はコンパイル結果をメモリ上のモジュールとして読み込み、ビルド時にアプリへ取り込みます。
`src/generated` の作成や直接 import、`build.outDir` の指定は不要です。
明示的に設定した OGP メタデータキャッシュは、従来どおり保存します。
設定から import した別ファイルも監視するため、公開パスなどを分けて管理できます。
init の開発クライアントは Vite の `BASE_URL` を使います。ホストの開発サーバーが
Vite の URL を処理する構成では、base に合わせた既存のアセット除外設定も保持してください。

既存の Vite 接続ファイルが生成先を直接 import している場合も、プラグインが
設定された出力先を仮想モジュールへ解決します。生成 TypeScript を参照する
`.js` 拡張子の import も互換性を維持します。新しい接続では上記の固定の入口を推奨します。

Vite 以外で使う CLI の `hono-decks compile` と `compileDecks()` は、
従来どおり `build.outDir`／`out` へファイルを書き出します。
コンパイル処理は両方式で共通です。実行環境にコンパイラーや Node のファイル操作は持ち込みません。

## Hono／MDX の Quick start

Vite を使う Hono／HonoX／Void アプリでは、以下の手動コンパイル手順ではなく、上記の init を使ってください。

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

AI agent を使う場合は `npx @tanstack/intent@latest install` を実行してください。公開パッケージには、agent が `node_modules` から検出できるバージョン付きの hono-decks Skill が含まれます。

`init` は次の2ファイルを作ります。既存ファイルは上書きしません。

- `hono-decks.config.ts`: CLI と runtime が共有する唯一の設定
- `src/decks.ts`: generated module をアプリへ接続する編集可能な facade

```ts
// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
});
```

```ts
// src/decks.ts
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
```

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
```

`decks/welcome/deck.mdx` を作り、`bunx hono-decks compile` を実行すると `src/generated/decks.ts` と slide modules が更新されます。generated directory は直接編集しません。

## One config, one runtime kit

以前のように compile option、`app.route()`、asset URL の mount path を別々に指定する必要はありません。`mountPath` は config に一度だけ書きます。generated module の `createDecks(config)` は次の configured kit を返します。

- `decks.mountPath`: `app.route()` に渡す正規化済みパス
- `decks.source`: config の `source()` が適用された `DeckSource`
- `decks.router(overrides?)`: config と呼び出し時 override を安全に深く合成した router
- `decks.context(overrides?)`: custom route 用 middleware
- `decks.paths(slug)`: viewer、render、print、presentation、presenter、embed、export、OGP image、assets の完全な route map

```ts
const paths = decks.paths("product");
paths.viewer;       // /decks/product
paths.render;       // /decks/product/render
paths.print;        // /decks/product/print
paths.presentation; // /decks/product/presentation
paths.presenter;    // /decks/product/presenter
paths.embed;        // /decks/product/embed
paths.exportPdf;    // /decks/product/export.pdf
paths.exportPng;    // /decks/product/export.png
paths.ogImage;      // /decks/product/og.png
paths.assets;       // /decks/product/assets
```

Viewer callbacks では同じ map を `input.meta.paths` から参照できます。文字列連結で route を再構築しないでください。

```ts
export default defineDecksConfig({
  mountPath: "/decks",
  router: {
    viewer: {
      controls: {
        after: ({ meta }) => [
          { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
        ],
      },
    },
  },
});
```

## Development integration

Cloudflare Workersでは、deck compilerをWranglerのcustom buildへ登録します。

```jsonc
// wrangler.jsonc
{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
```

`wrangler dev --live-reload`が初回compileとMDX、deck-local component、asset、theme CSSの変更監視、ブラウザ更新を担当します。deploy時にも同じbuild commandが実行されます。

HonoXまたはViteでは、既存のVite configへpluginを追加します。

```ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

pluginはVite起動前にcompileし、deck rootと`hono-decks.config.ts`をVite watcherへ登録します。再compileに成功すると、安全にislandを維持できる場合はスライドの内容だけを更新し、現在のスライド・ステップとislandの状態を保ちます。islandのコード、props、Markdownのコンテキスト、構造などが変わり、安全に引き継げない場合は表示ページを再読み込みし、スライドとステップを復元します。どちらの構成でも通常の`bun run dev`だけでauthoringできます。

## Runtime configuration

すべての resolver は1個の object argument を受け取ります。引数の順序を覚える必要がなく、将来 input が増えても callback の意味が崩れません。

```ts
interface AppEnv {
  Bindings: {
    BROWSER?: DeckBrowserRunBinding;
    DECK_EXPORT_TOKEN?: string;
  };
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
  router: {
    presenter: {
      enabled: ({ dev }) => dev,
      viewerControl: true,
    },
    export: {
      authorize: ({ c }) =>
        c.req.header("authorization") === `Bearer ${c.env.DECK_EXPORT_TOKEN}`,
      browser: ({ c }) => c.env.BROWSER,
      pdf: true,
      png: true,
    },
  },
});
```

`dev`を省略すると、ViteとWranglerが設定する`NODE_ENV`から判定します。標準設定では、`vite`と`wrangler dev`は開発モード、プロダクションビルドと`wrangler deploy`は本番モードになります。`dev: false`やresolverを指定した場合は明示値が優先され、判定できない環境では本番モードとして扱われます。

呼び出し元で一部だけ変える場合は `decks.router({ viewer: ... })` を使います。viewer controls、document surfaces、presenter、embed、export などの nested option は config を失わずに合成されます。機能を止めるときは `presenter: false`、`embed: false`、`export: false` のように明示できます。

## Custom application routes

```ts
import type { DeckContextVariables } from "hono-decks";
import { decks } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  `${decks.mountPath}/:slug/about`,
  decks.context(),
  (c) => c.json({
    title: c.var.deckMeta.title,
    viewer: c.var.deckMeta.paths.viewer,
    slides: c.var.deckToc,
  }),
);
```

`decks.context()` は configured source、mount path、dev policy、viewer controls を自動的に共有します。custom route と標準 viewer で draft 判定や URL がずれません。

標準ページ全体を差し替える場合は config の `viewer.render` を使います。callback には `frame`、`controls`、`toc`、`meta.paths` が渡るため、標準部品を再利用しながら app-owned layout を構築できます。

## Deck-local components and CSS

Directory deck は次の構造を使えます。

```text
decks/product/
  deck.mdx
  theme.css
  assets/
    diagram.svg
  components/
    index.tsx
    client/
      index.tsx
```

`components/index.tsx` は server-side JSX component、`components/client/index.tsx` は browser で hydrate する component です。`theme.css` はその deck だけに適用されます。 テーマ未指定時は白背景と濃い文字色を使います。配色を変える場合は `theme.css` で `--hono-decks-background` と `--hono-decks-color` を合わせて指定してください。1920 × 1080 の固定キャンバス内では `px` や `rem` を使います。`vw` / `vh` はブラウザのズームに応じて内容の配置も変えてしまいます。画像は compile 時に検出され、`mountPath` と slug を使った public URL に書き換えられます。

## Embedding

同じdocumentへ複数配置する場合は `createDeckViewerEmbed()` を使えます。これは app が取得済みの `CompiledDeck` から iframe viewer、controls、TOC を組み立てる high-level helper です。

Embedding from an external blog では `router.embed` を有効にし、`frameAncestors` に許可する親 origin を明示してください。`iframe navigationにCORSは不要`ですが、CSP の `frame-ancestors` は必要です。

```ts
router: {
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
}
```

```html
<iframe
  src="https://slides.example.com/decks/product/embed"
  title="Product deck"
  allow="fullscreen"
></iframe>
```

## Browser export

PDF/PNG export は Cloudflare Browser Rendering binding を resolver から返すと有効になります。viewer に export control が表示されるのは、その request が `authorize` を通った場合だけです。token は `vars` ではなく Wrangler secret として管理してください。

`Cmd + P` / `Ctrl + P` は viewer から print route を開き、印刷用に全 slide を表示します。server-side export も同じ print route を Browser Rendering に渡します。

## Build-time OGP recipe

viewer の share image をビルド時に生成する場合は、`router.viewer.openGraph` を有効にします。既定の画像パスは `decks.paths(slug).ogImage` です。viewer は request origin から Open Graph / Twitter Card の絶対URLを生成します。

```ts
export default defineDecksConfig({
  mountPath: "/decks",
  router: {
    viewer: { openGraph: true },
  },
});
```

独自CDNを使う場合は `imagePath: ({ deck }) => \`https://cdn.example.com/${deck.slug}.png\`` のように resolver で上書きできます。`false` または未指定なら social metadata は出力しません。

生成処理は core に含まれません。`examples/ogp` では `hono-decks/node` の `compileDecks()` が返すデッキのメタデータを Satori + resvg へ渡し、1200×630 PNG を Workers Static Assets へ保存します。Satori / resvg は example だけの依存で、Browser Rendering binding は不要です。Satori は TTF / OTF / WOFF を読み込めますが WOFF2 は扱えないため、対象言語の font file を build script から明示的に渡してください。

`build.ogpCacheFile` は `@[card](...)` が参照する外部サイトのメタデータキャッシュです。viewer 自身の share image とは別機能です。

## Public entries

- `hono-decks`: config、configured kit の型、deck authoring、viewer/embed customization、source decorator
- `hono-decks/advanced`: `defineDecks()`、`decksRouter()`、`deckContext()`、raw renderer など独自 pipeline 用
- `hono-decks/client`: browser hydration
- `hono-decks/node`: compiler と Node filesystem adapter
- `hono-decks/vite`: 開発中のcompileとwatchをViteへ組み込むintegration
- `hono-decks/cli`: programmatic CLI runner

通常の generated workflow では root entry だけを import します。`hono-decks/advanced` は custom `DeckSource` や router をゼロから組み立てる場合に限定してください。

## Cloudflare Workers

Wrangler は JSONC config、current compatibility date、必要に応じた `nodejs_compat` を使います。binding types は `wrangler types` で生成し、hand-written binding interface と実際の config がずれないようにしてください。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-decks",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-14",
  "compatibility_flags": ["nodejs_compat"]
}
```

## Advanced API

既存 manifest、database、remote object store から完全に独自の runtime を作る場合だけ advanced entry を使います。

```ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal-slides", decksRouter({ source, dev: true }));
```

このレベルでは mount path、source policy、option merge をアプリ側が管理します。通常の利用では generated `createDecks(config)` のほうが安全で短くなります。

## Examples

- `examples/minimal`: standalone Worker の最小構成
- `examples/basic`: R2、Browser Rendering、custom routes、client components
- `examples/honox`: HonoX integration

## Node ビルド結果と失敗時の復旧

`compileDecks()` の戻り値は `CompileDecksResult` です。出力先、生成された
`decks.ts` のパス、各デッキのメタデータ、スライドのモジュールパスを返します。
描画には、生成された `decks.ts` の `createDecks()` を使ってください。
戻り値をそのまま `defineDecks()` へ渡すコードは変更が必要です。
タイトル、警告、アセット、ノートを `result.decks` から読む処理は引き続き使えます。

同期レンダラーは同期の描画関数を実行します。非同期の本文には非同期版を使うよう
エラーで案内し、描画できないビルド結果を渡した場合も空表示にせずエラーにします。

生成処理とクライアント資産のビルドが完了してから、生成ファイルと OGP キャッシュを
反映します。反映中に失敗した場合は、直前の内容へ戻します。OS やプロセスの停止時の
一括反映、複数プロセスの同時実行は保証しません。復元自体に失敗した場合は、
復旧用ファイルを残し、その場所をエラーに表示します。

## Markdownアダプター

従来の `build.markdown: "void"` に加えて、ビルド時に読み込むアダプターを指定できます。

```ts
export default defineDecksConfig({
  mountPath: "/slides",
  router: { clientEntryAssetPath: "/_assets/client" },
  build: {
    root: "decks",
    markdown: { adapter: "hono-decks/adapters/hono-markdown" },
  },
});
```

このブリッジは共通の `@ts-76/hono-markdown` を利用します。共通パッケージはVoid・Viteに依存しません。このアダプターを選ぶ場合はコンパイラー用peer dependenciesも導入します。
既存の `markdown: "void"` は、既に導入したVoidアダプターの公開コンパイラーAPIでも引き続き動作します。
`init --framework void --install` の導入手順、既存のdev／buildコマンドは変わりません。

設定はサーバー実行時にも読み込むため、アダプターは文字列で指定し、Node用のfactoryを設定ファイルへimportしません。
Hono＋Vite・HonoXは引き続きMDXが標準で、VoidやMarkdown用パーサーの追加は不要です。
これらでMarkdownを使う場合は、共通パッケージとコンパイラー用peer dependenciesを導入し、上記ブリッジを選択します。
Viteは仮想モジュールを利用し、既存の `hono-decks compile` はファイル出力を維持します。

独自アダプターは `createMarkdownAdapter({ cwd, options })` をexportし、`read(source)`、非同期の
`compile(source, { sourcePath })`、`client(islands)` を返します。型は `hono-decks/adapters/hono-markdown` からimportできます。
スライド分割・メタデータ・アセット・ルーティング・表示中スライドの判定はhono-decksが担当し、Markdownの変換とislandのスケジュールはアダプターが担当します。
同じVoidアプリにhonoxpressを組み込んでも、ドキュメントとスライドが互いの内部実装に依存する必要はありません。

Hono＋Vite・HonoXのinitは、dev serverが標準で`.js`を除外するため、拡張子なしの
`/_assets/client`を設定します。配信は既存アプリのミドルウェア・認可を通ります。
既存CLI構成の標準パス`/_assets/client.js`は維持します。VoidなしのMarkdown実アプリ検証は、
`HONO_MARKDOWN_PACKAGE`に共通パッケージのtarballを指定し、`node scripts/verify-vite-init.mjs`で実行できます。
