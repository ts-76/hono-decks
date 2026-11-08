# hono-decks

[English](https://github.com/ts-76/hono-decks/blob/main/packages/decks/README.md) | 日本語

Hono と Cloudflare Workers 上で MDX のスライドを配信するためのライブラリです。ビルド時に MDX を TypeScript module へ変換し、Worker runtime ではファイルシステムや compiler を読み込みません。

CLIのinitは `decks/index.ts` を作り、package.jsonに `#decks` を登録します。中間コードはGit管理しない内部キャッシュ `.hono-decks/` に保存し、既存のdev/build/typecheck/test/deployコマンドの前にコンパイルを追加します。Viteは引き続きメモリ上の仮想モジュールを使います。独自ビルド向けの `build.outDir` 指定も維持しています。Basic・Minimal・OGPは `cf dev/build/deploy` を使い、`wrangler.config.ts` はcfが使うビルド処理の設定だけを保持します。

cfのサンプルはデッキ編集時にローカルWorkerを再ビルドします。現行のcfはWranglerの `--live-reload` を受け付けないため、ブラウザは再読み込みしてください。Viteのライブ更新は維持しています。

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

新規導入では`@latest`で現在の公開版を選びます。同じ環境を再現する場合は、動作確認したバージョンを明示してください。1.x からの移行は[移行ガイド](https://github.com/ts-76/hono-decks/blob/main/MIGRATION.md#日本語)を参照してください。

どちらも、既存の Vite 設定を保持して自動コンパイルを登録し、
`hono-decks.config.ts`、`src/decks.ts`、サンプルの
`decks/welcome/deck.mdx` を作ります。生成ファイルがない状態からでも
通常の `dev`／`build` だけで動き、手動 `compile` やビルドコマンドの変更は不要です。
生成コードは Vite の仮想モジュールとして扱い、ファイルへ出力しません。Void 用のアダプターは必要ありません。

| 構成 | アプリへの接続 |
| --- | --- |
| `--framework hono` | 既存の Hono エントリーにルーターを追加。既存のミドルウェアとルートを保持 |
| `--framework honox` | `createApp()` のオプションを `virtual:hono-decks/honox` の `withHonoXDecks()` で包む。既存のオプション、ページ、ミドルウェアを保持 |

公開先は `/decks/welcome` です。同名の既存デッキがあれば、サンプルには
空いている名前を選びます。既存の `.mdx`、コンポーネント、画像はそのまま使えます。

Hono では、`src/index.ts`／`.tsx`／`.js`／`.mts`／`.mjs` または
`src/app.ts`／`.tsx`／`.js` の候補が1つなら自動検出します。
独自の場所にある場合や複数の候補がある場合は、
`--entry src/server.ts` のように指定してください。
自動接続は `const app = new Hono()` で作ったアプリを default export する形式に対応します。
先行する catch-all／動的ルートなど、安全に接続できない構成ではファイルを変更せず、
手動接続の案内を表示します。

HonoX は標準の `app/routes` と、`app/server.ts` で `createApp()` を default export
する構成に対応します。`init` は `app/server.ts` を次のように書き換えます。

```ts
/// <reference types="hono-decks/vite-env" />
import { withHonoXDecks } from "virtual:hono-decks/honox";
import { decks } from "../src/decks";
import { createApp } from "honox/server";

export default createApp(withHonoXDecks({ /* 既存のオプション */ }, decks.router()));
```

`virtual:hono-decks/honox` は Vite プラグインが提供し、HonoX と同じ規則でルートを探索して、
HonoX の公開 `ROUTES` API にデッキの router を追加します。そのためデッキのルートにも
`app/routes/_middleware.ts` が適用され、**公開パスは `mountPath` 一か所の変更で切り替わります**。
ルート用ディレクトリの作成・改名や、glob のアプリへのコピーは不要です。
動的ルートや catch-all を含め、既存ルートと重なる場合はエラーにします。
開発中の公開パス変更では、コンパイル後に Vite を自動で再起動してルートを切り替えます。
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
動作確認した組み合わせは Node >=24.22.1 <25、Void 1.2.1、Vite 8.3.4、Hono 4.13.16 です。既存のVoid 1.1.11アプリでは互換性のある0.6アダプターを維持し、未導入の場合も0.6を選択します。0.9.1では[Void／Cloudflare依存の既知リスク](https://github.com/ts-76/void-plugin-hono-jsx/blob/v0.9.1/docs/dependency-security.md)が残ります。

`--install` は npm／pnpm／Yarn／Bun を packageManager または lockfile から判定し、
不足する依存だけを追加します。互換性のない既存バージョンは自動更新せずエラーにします。
Yarn は node_modules linker を対象とし、PnP は手動インストールを使ってください。
依存を自分で管理する場合は `--install` を省略できます。ローカルでビルドしたアダプターは
`--adapter /absolute/path/void-plugin-hono-jsx.tgz` で指定できます。
アプリ設定の衝突はインストール前に検査し、インストール失敗時は接続ファイルを作りません。
パッケージマネージャーによる依存・lockfileの変更は残る場合があります。

`init --framework void` は、既存のルート `vite.config.*` の default export を
`withHonoDecks()` で包み、次のファイルを作ります。

- `hono-decks.config.ts`：公開パス `/decks`、入力先 `decks`、Hono Markdown の有効化
- `src/decks.ts`：アプリ側で編集できる接続ファイル
- `middleware/hono-decks.ts`：スライド配下のルーティング、Markdown の CSS、開発時の自動更新
- `decks/welcome/deck.md` と `Counter.tsx`：`/decks/welcome` で開ける対話可能なサンプル

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
`--out` は、以下の汎用 init 向けのオプションです。

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
`init` が作る `src/decks.ts` は、この仮想モジュールにランタイムのオプションを渡します。

```ts
/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks({
  presenter: { enabled: ({ dev }) => dev },
});
```

仮想モジュールは `createDecks(options)`、コンパイル時の `mountPath`、`compiledDecks` を export します。
型定義はパッケージに同梱しているため、初回の `dev`／`build` 前でも型チェックできます。
`createDecks<AppEnv>()` とすると、binding の型が resolver に反映されます。

通常は `decks/` の原稿・画像・部品と設定ファイルを編集します。
Vite はコンパイル結果をメモリ上のモジュールとして読み込み、ビルド時にアプリへ取り込みます。
`.hono-decks` の作成や直接 import、`build.outDir` の指定は不要です。
明示的に設定した OGP メタデータキャッシュは、従来どおり保存します。
設定から import した別ファイルも監視するため、公開パスなどを分けて管理できます。
init の開発クライアントは Vite の `BASE_URL` を使います。ホストの開発サーバーが
Vite の URL を処理する構成では、base に合わせた既存のアセット除外設定も保持してください。

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

`init` は次のファイルを作り、`.gitignore` に `/.hono-decks/` を追加します。既存ファイルは上書きしません。

- `decks/config.ts`: CLI だけが読むビルド設定(Worker は import しません)
- `decks/index.ts`: 生成された `createDecks()` に渡すランタイムのオプション
- `decks/welcome/deck.mdx`: `decks` ディレクトリが無い場合のサンプル

```ts
// decks/config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: ".hono-decks",
  },
});
```

```ts
// decks/index.ts
import { createDecks } from "#decks";

export const decks = createDecks();
```

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "../decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
```

`bunx hono-decks compile` を実行すると `.hono-decks/decks.ts` と slide modules が更新されます。生成ディレクトリは直接編集もコミットもしません。dev・build・typecheck のたびに作り直されます。

## ビルド設定とランタイムのオプション

`hono-decks.config.ts` にはビルド設定だけを書きます。compile option、`app.route()`、asset URL の mount path を別々に指定する必要はありません。compiler が `mountPath` を生成モジュールに埋め込み、別のパスに mount すると明示的なエラーになります。生成された `createDecks(options)` は次を返します。

- `decks.mountPath`: `app.route()` に渡す正規化済みパス
- `decks.source`: `source` オプションを適用した `DeckSource`
- `decks.router(overrides?)`: 呼び出し時の override をオプションへ合成した router
- `decks.context(overrides?)`: custom route 用 middleware
- `decks.paths(slug)`: viewer、render、print、presentation、presenter、embed、export、OGP image、assets の完全な route map

```ts
const paths = decks.paths("product");
paths.viewer;       // /decks/product
paths.render;       // /decks/product/render
paths.print;        // /decks/product/print
paths.overview;     // /decks/product/overview
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
export const decks = createDecks({
  viewer: {
    controls: {
      after: ({ meta }) => [
        { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
      ],
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

pluginはVite起動前にcompileし、deck rootと`hono-decks.config.ts`をVite watcherへ登録します。再compileに成功すると、既存のislandを安全に識別できる場合は表示ページを再読み込みせずに内容を更新します。対応するprops・Markdownコンテキストの変更、別々のislandの並べ替え・追加・削除でも状態を維持し、現在のスライド・ステップを保ちます。islandの部品やその他のクライアントコードを編集すると、表示用iframeを再読み込みしてislandの状態をリセットします。viewerの枠は維持し、スライドとステップを復元します。同一islandの区別がつかない場合、アダプターが更新時の初期化に対応していない場合、取得に失敗した場合なども同じ動作になります。どちらの構成でも通常の`bun run dev`だけでauthoringできます。

## Runtime configuration

ランタイムのオプションは `createDecks()` に渡します。すべての resolver は1個の object argument を受け取ります。引数の順序を覚える必要がなく、将来 input が増えても callback の意味が崩れません。

```ts
// src/decks.ts
import type { DeckBrowserRunBinding } from "hono-decks";
import { createDecks } from "#decks";

interface AppEnv {
  Bindings: {
    BROWSER?: DeckBrowserRunBinding;
    DECK_EXPORT_TOKEN?: string;
  };
}

export const decks = createDecks<AppEnv>({
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
});
```

`dev`を省略すると、ViteとWranglerが設定する`NODE_ENV`から判定します。標準設定では、`vite`と`wrangler dev`は開発モード、プロダクションビルドと`wrangler deploy`は本番モードになります。`dev: false`やresolverを指定した場合は明示値が優先され、判定できない環境では本番モードとして扱われます。

呼び出し元で一部だけ変える場合は `decks.router({ viewer: ... })` を使います。マージ規則は一つで、オブジェクトは再帰的にマージ、配列は連結し、それ以外の値(`false` や関数を含む)は置き換えます。機能を止めるときは `presenter: false`、`embed: false`、`export: false` のように明示できます。

デッキが無い場合・本番での下書き・無効にしたページは `c.notFound()` を返すため、404 ページはアプリの `app.notFound()` が表示します。

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

## 既定スタイルを拡張する

hono-decks の既定の見た目は、2つのカスケードレイヤーにまとめています。`@layer hono-decks.base` はトークン・ページの既定値・スライド内の文字組み、`@layer hono-decks.components` は組み込みコンポーネントとビューアー・発表者画面・オーバービューの見た目です。レイヤー内のセレクターはすべて `:where()` で包んでいるため、詳細度は0です。`theme.css`、デッキのコンポーネントが出力する CSS、ルーターの `style` オプション、`viewer.style`、埋め込み先ページの CSS など、レイヤー外のルールであれば、`!important` やセレクターの追加なしに既定値を上書きできます。

~~~css
/* decks/product/theme.css: 単純なセレクターで十分です */
code {
  border-radius: 999px;
}
~~~

ビューアーはスライドの進捗を、スライド下端の高さ4pxのバーで表示します。現在の位置は `role="progressbar"` の値と、画面には表示しないテキストで支援技術に伝えます。`viewer.controls.progress` に `"count"` を指定すると「n / total」の数字表示、`"both"` でバーと数字の両方になります(既定は `"bar"`)。バーの色は `--hono-decks-viewer-progress-color` と `--hono-decks-viewer-progress-track` で変えられ、`viewer.controls.hidden: ["position"]` で進捗表示を非表示にできます。

スライドの重ね合わせ・切り替え・段階表示・キャンバスの拡大縮小・印刷レイアウトなど、動作に必要なルールはレイヤーに入れず、従来の詳細度のまま出力します。そのため、テーマに `.slide { position: relative; }` のような指定があっても表示の仕組みは壊れません。これらは `--hono-decks-transition-duration`、`--hono-decks-transition-easing`、`[data-fire-effect]` の `--fire-*` などのカスタムプロパティで調整します。

アプリ側の CSS もレイヤーを使っている場合(Tailwind CSS v4 など)は、hono-decks のスタイルより前にレイヤーの順序を宣言し、アプリのレイヤーを後ろに置いてください。

~~~css
@layer hono-decks, theme, base, components, utilities;
~~~

## Embedding

同じdocumentへ複数配置する場合は `createDeckViewerEmbed()` を使えます。これは app が取得済みの `CompiledDeck` から iframe viewer、controls、TOC を組み立てる high-level helper です。

Embedding from an external blog では `embed` オプションを有効にし、`frameAncestors` に許可する親 origin を明示してください。`iframe navigationにCORSは不要`ですが、CSP の `frame-ancestors` は必要です。

```ts
createDecks({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
});
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

viewer の share image をビルド時に生成する場合は、`viewer.openGraph` を有効にします。既定の画像パスは `decks.paths(slug).ogImage` です。viewer は request origin から Open Graph / Twitter Card の絶対URLを生成します。

```ts
export const decks = createDecks({
  viewer: { openGraph: true },
});
```

独自CDNを使う場合は `imagePath: ({ deck }) => \`https://cdn.example.com/${deck.slug}.png\`` のように resolver で上書きできます。`false` または未指定なら social metadata は出力しません。

生成処理は core に含まれません。`examples/ogp` では `hono-decks/node` の `compileDecks()` が返すデッキのメタデータを Satori + resvg へ渡し、1200×630 PNG を Workers Static Assets へ保存します。Satori / resvg は example だけの依存で、Browser Rendering binding は不要です。Satori は TTF / OTF / WOFF を読み込めますが WOFF2 は扱えないため、対象言語の font file を build script から明示的に渡してください。

`build.ogpCacheFile` は `@[card](...)` が参照する外部サイトのメタデータキャッシュです。viewer 自身の share image とは別機能です。

## スライドのオーバービュー

`/:slug/overview` は、デッキのテーマのまま全スライドをサムネイルのグリッドで表示します。サムネイルを選ぶとそのスライドからビューアーで開き、ビューアーのグリッドボタンからは現在のスライドを強調した状態でオーバービューを開けます。`pages: { overview: false }` で無効化でき、ボタンだけを隠す場合は `viewer.controls.hidden: ["overview"]` を指定します。

### X(Twitter)の Player Card

`twitterPlayer` を指定すると、ポスト内でスライドを再生できる Player Card を出力します。カードはデッキの `embed` ルートを参照するため、`embed` も有効にしてください。hono-decks はそのルートの `frame-ancestors` に X のオリジンを自動で追加します。配信は HTTPS が必須です。

~~~ts
createDecks({
  embed: {},
  viewer: { openGraph: { twitterPlayer: true } }, // または { width: 1280, height: 720 }
});
~~~

X は Player Card の公式ドキュメントを公開しておらず、挙動が変わる可能性があります。[2026年10月の公開検証](https://thehouse.game/updates/2026-10-22-interactive-x-embeds)では、通常のポストは承認の手続きなしに Web 版でインライン表示されました。一方、X のモバイルアプリでは埋め込み URL がアプリ内ブラウザで開き、X の記事(Articles)ではプレーヤーが動きませんでした。画像だけを表示する環境もあるため、`ogImage` も用意しておいてください。X はカードを URL 単位でキャッシュします。タグを変えた後は、クエリ文字列を付けるなど別の URL で共有すると反映を確認できます。

## Public entries

- `hono-decks`: ビルド設定、ランタイムのオプションの型、deck authoring、viewer/embed customization、source decorator
- `hono-decks/advanced`: Worker-safe な `configureDecks()`、`decksRouter()`、`deckContext()`、raw renderer など独自 pipeline 用
- `hono-decks/client`: browser hydration
- `hono-decks/node`: Node 専用の compiler、config loader、filesystem adapter
- `hono-decks/honox`: HonoX のルート合成と衝突検査(`virtual:hono-decks/honox` が使用)
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

このレベルでは mount path、source policy、option merge をアプリ側が管理します。自分で読み込んだコンパイル済みデータには `configureDecks({ mountPath, decks }, options)` を使うと、生成された `createDecks()` と同じ API が得られます。通常の利用では生成された `createDecks()` のほうが安全で短くなります。

## Examples

- `examples/minimal`: standalone Worker の最小構成
- `examples/basic`: R2、Browser Rendering、custom routes、client components
- `examples/honox`: `virtual:hono-decks/honox` による HonoX integration

## Node ビルド結果と失敗時の復旧

`compileDecks()` の戻り値は `CompileDecksResult` です。出力先、生成された
`decks.ts` のパス、各デッキのメタデータ、スライドのモジュールパスを返します。
描画には、生成された `decks.ts` の `createDecks()` を使ってください。
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
  mountPath: "/decks",
  build: {
    root: "decks",
    markdown: { adapter: "hono-decks/adapters/hono-markdown" },
  },
});
```

このブリッジは共通の `@ts-76/hono-markdown` を利用します。共通パッケージはVoid・Viteに依存しません。

新しい導入では `@ts-76/hono-markdown` 0.2.1以降がパーサー2パッケージを自動導入します。利用者側で `markdown-exit`・`markdown-it-container` を追加する必要はありません。既存Void 1.1用の0.6アダプターでは従来のpeer依存をinitが補完します。

このアダプターを選ぶ場合はコンパイラー用peer dependenciesも導入します。
既存の `markdown: "void"` は、既に導入したVoidアダプターの公開コンパイラーAPIでも引き続き動作します。
`init --framework void --install` の導入手順、既存のdev／buildコマンドは変わりません。

アダプターはビルド時にだけ読み込まれます。設定ファイル自体もWorkerのバンドルには含まれません。
Hono＋Vite・HonoXは引き続きMDXが標準で、VoidやMarkdown用パーサーの追加は不要です。
これらでMarkdownを使う場合は、共通パッケージとコンパイラー用peer dependenciesを導入し、上記ブリッジを選択します。
Viteは仮想モジュールを利用し、既存の `hono-decks compile` はファイル出力を維持します。

独自アダプターは `createMarkdownAdapter({ cwd, options })` をexportし、`read(source)`、非同期の
`compile(source, { sourcePath })`、`client(islands)` を返します。型は `hono-decks/adapters/hono-markdown` からimportできます。
スライド分割・メタデータ・アセット・ルーティング・表示中スライドの判定はhono-decksが担当し、Markdownの変換とislandのスケジュールはアダプターが担当します。
同じVoidアプリにhonoxpressを組み込んでも、ドキュメントとスライドが互いの内部実装に依存する必要はありません。

生成されたクライアントのバンドルは、mount path配下の拡張子なしの`/_assets/client`で配信します。
`@hono/vite-dev-server`が標準で`.js`を除外するためです。配信は既存アプリのミドルウェア・認可を通り、
`createDecks({ client: { path } })`で変更できます。VoidなしのMarkdown実アプリ検証は、
`HONO_MARKDOWN_PACKAGE`に共通パッケージのtarballを指定し、`node scripts/verify-vite-init.mjs`で実行できます。

プレゼンテーションは次の1枚の画像・CSS背景画像を先読みし、デコード済みのリソースを同じ画面内で再利用します。背景画像の保持数には上限を設け、データ節約モードでは自動先読みを控えます。埋め込みローカルアセットの既定値はETagによる再検証（`public, max-age=0, must-revalidate`）です。明示的なキャッシュ設定は維持し、開発時のアセット応答は `no-store` にします。

## プレゼンタータイマー

デッキのフロントマターに `duration: 20m` を指定すると、発表時間の目安を表示します。`1h30m`、`90s`、分単位の数値も使えます。`createDecks({ presenter: { duration: 1200 } })` で上書きできます。こちらの数値は秒単位で、同じ文字列形式も使えます。タイマーは自動では開始しません。発表を始めるときに開始ボタンか `T` キーで開始し、`T` キーで一時停止し、Reset でリセットします。タイマー下の「設定」を開いて目標時間(分)を入力すると、その発表者タブでの目標時間を設定・変更できます。設定値より優先され、再読み込み後も保持され、リモート操作の画面にも反映されます。空にすると目標時間を外します。「既定に戻す」で設定値に戻せます。経過時間と一時停止状態はプレゼンターのタブを再読み込みしても保持されます。目標時間がある場合は、残り時間とペースも表示します。ペースは、現在のスライドに割り当てた時間と比べて、予定どおり・先行・遅れのどれかを示します。スライドのフロントマターに `time: 3m`(`duration` と同じ書式)を書くと、そのスライドの持ち時間を指定できます。指定のないスライドは残りの時間を等分します。付録の最初のスライドに `appendix: true` を書くと、そのスライドと以降のスライドをペースの計算から外します。表示する項目は、デッキのフロントマターの `timer: { pace: false, remaining: false, overtime: false }` か、`createDecks()` の `presenter: { timer: { ... } }` で既定値を決められます。発表者画面ではタイマー下の「設定」の「表示」からタブ単位で切り替えられ、リモート操作の画面にも反映されます。残り時間を非表示にしても、超過時間を表示する設定なら発表時間を超えた時点で超過時間を表示します。超過時間を非表示にすると、残り時間は 00:00 で止まります。

## 開発中のはみ出し警告

開発時は表示中のスライドを検査し、1920 × 1080 のキャンバスからはみ出す要素や、`overflow: hidden` / `clip` で切れる内容を警告パネルと枠線で示します。スライドの切り替え、画面サイズ変更、画像・フォントの読み込み、ライブ更新後に再検査します。意図的にはみ出す要素に `data-hono-decks-allow-overflow` を付けると、その子要素も検査対象外になります。装飾用の `aria-hidden="true"` の領域も除外します。スクロール可能な領域は切り取り境界として扱い、影などの視覚効果は測定しません。本番・印刷ページには検査処理を含めません。

## 標準レイアウト

スライドの `layout` には `default`、`cover`、`statement` に加えて `two-cols`、`image-left`、`image-right`、`section`、`quote`、`center` を指定できます。MDX の `two-cols` では、空行で囲んだ `::right::` を単独行に書くと、前後が左右の列になります。

~~~mdx
---
layout: two-cols
---
## 左

左の内容

::right::

## 右

右の内容
~~~

画像レイアウトでは `image: ./assets/photo.jpg` または画像 URL を指定し、必要なら `image-alt: 画像の説明` を追加します。省略時は装飾画像として扱います。`section` は見出しと副題、`quote` は引用と出典に使えます。`center` は上下左右を中央揃えにし、`statement` は上下のみ中央揃えにします。テーマの `--hono-decks-column-gap`、`--hono-decks-image-width`、`--hono-decks-image-radius` で調整できます。列の区切りは MDX で利用できます。

## 別の端末からの操作と追従

Cloudflare Workers では `hono-decks/remote` を使ってライブ同期を有効にできます。Worker から `DeckRemoteRoom` をエクスポートし、Durable Object の binding と `remote.namespace`、`remote.authorize` を設定します。ルーム名の初期値はデッキの slug です。`session` で変更でき、`follow: false` にすると閲覧者は追従を停止した状態で開始します。発表者画面と `/:slug/remote` から操作でき、許可された閲覧者は発表位置への追従を停止・再開できます。Next と Previous の処理には発表者画面を開いておいてください。

リモート操作の画面は、スマートフォンを片手で使うことを想定しています。発表者ノートを画面いっぱいに表示し、親指の届く下部に大きな「次へ」と「前へ」、任意のスライドへ移動できるスライド一覧を置きます。上部には接続状態、発表位置、経過時間を表示し、発表時間を設定していれば残り時間とペースも表示します。タイマーは発表者画面の発表タイマーに連動します(開始・一時停止・リセットは発表者画面で行います)。時刻は利用できる環境では Temporal API(`Temporal.Now`)から取得し、未対応の環境では `Date.now()` を使います。Workers では `temporal` 互換性フラグで有効になります(互換性日付 2026-12-01 以降は既定で有効)。各端末は自分の時計で経過時間だけを測るため、発表者画面・ルーム・スマートフォンの時計のずれは表示に影響しません。表示中は Screen Wake Lock API で画面のスリープを防ぎ、対応端末ではタップ時に短く振動します。

発表者画面の操作バーには **QR** ボタンがあります。押すと `/:slug/remote` の絶対 URL(`lang` などのクエリは維持)を QR コードとリンクで表示し、スマートフォンで読み取るだけでリモート操作の画面を開けます。スマートフォン側も同じ発表者の認可を通る必要があります。Cookie でログインする構成では、`remote.url({ c, slug, url })` で有効期限の短い署名付きリンクを返してください。スマートフォンから `localhost` には接続できないため、開発中はこのフックで LAN のアドレスやトンネルのホストに置き換えられます。

ルームは WebSocket Hibernation API を使うため、通信のないルームはメモリから退避され、実行時間の課金は発生しません。保存するのは現在の発表位置だけです。最後の接続が閉じるとアラームを設定し、1 時間以内に再接続がなければルームのストレージをすべて削除します。削除後は何も残りません。時間はサブクラスで変更できます(`class Room extends DeckRemoteRoom { idleTimeoutMs = 10 * 60 * 1000 }`)。位置が保存されていないルームでは、スライド 1 に戻さず最初に接続した発表者の位置を引き継ぎます。

WebSocket の接続ごとに認可します。presenter は操作でき、follower が受け取るのは位置情報だけです。リモコン画面には発表者だけに許可するノートが含まれ、ソケットには位置とコマンドだけを送ります。メッセージは検証し、1 KB と接続ごとの送信頻度を制限します。異なるオリジンからのブラウザー接続は拒否します。remote の認可はデッキ全体の保護ではありません。発表者画面などノートを含む経路も別途保護してください。HTTPS と安全なセッション Cookie を使い、認証済みコンテンツをキャッシュしないようにします。CSP の `connect-src` には必要に応じて `wss:` または `ws:` を許可してください。同一オリジンはブラウザーによっては `'self'` で許可されます。binding、migration、認可の例はレシピを参照してください。


ビューアーでは、左右矢印、Page Up / Page Down、Space / Shift + Space、Home、End でスライドを移動できます。`F` で全画面、`O` でオーバービュー（有効な場合）、`T` で目次、`?` でショートカット一覧を開きます。目次ボタンからスライドを選択でき、Esc で目次やヘルプを閉じます。スライド上で約2.5秒操作がないとコントロールが隠れ、操作すると再表示されます。常に表示するには `viewer.controls.autoHide: false` を指定します。

## UIの言語と文言

標準UIの言語は解決済みの `document.lang` に従います（画面別の設定も適用され、既定値は `ja`）。`ja-JP` などは日本語、それ以外は英語を使用します。実行時オプションで言語ごとに文言を上書きできます。

```ts
createDecks({
  document: { lang: "ja" },
  messages: { ja: { previous: "戻る" }, en: { previous: "Back" } },
});
```

`slidePosition` と `progressText` には `{current}` と `{total}`、`slideCount` と `slideCountOne` には `{count}` を指定できます。ビューアーの操作では既存の `viewer.controls.labels` が優先されます。独自画面向けに `DeckMessages`、`resolveMessages`、`formatMessage` も公開しています。
