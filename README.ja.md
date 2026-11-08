# hono-decks

<p align="center">
  <img src="assets/icon-512.png" alt="Honoの炎と重なったプレゼンテーションスライドを組み合わせたHono Decksアイコン" width="160" />
</p>

[English](https://github.com/ts-76/hono-decks/blob/main/README.md) | 日本語

Hono / Cloudflare Workers で MDX の slide deck を配信するための monorepo です。MDX は CLI で TypeScript module に変換され、Worker は生成済み module だけを読み込みます。

CLIのinitは `decks/index.ts` を作り、package.jsonに `#decks` を登録します。中間コードはGit管理しない内部キャッシュ `.hono-decks/` に保存し、既存のdev/build/typecheck/test/deployコマンドの前にコンパイルを追加します。Viteは引き続きメモリ上の仮想モジュールを使います。独自ビルド向けの `build.outDir` 指定も維持しています。Basic・Minimal・OGPは `cf dev/build/deploy` を使い、`wrangler.config.ts` はcfが使うビルド処理の設定だけを保持します。

cfのサンプルはデッキ編集時にローカルWorkerを再ビルドします。現行のcfはWranglerの `--live-reload` を受け付けないため、ブラウザは再読み込みしてください。Viteのライブ更新は維持しています。

## 最短の導入

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

`init` は次の 3 ファイルを作り、`.gitignore` に `/.hono-decks/` を追加します。

```ts
// decks/config.ts — CLI と Vite plugin だけが読むビルド設定
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
// decks/index.ts — ランタイムのオプションはここに書く
import { createDecks } from "#decks";

export const decks = createDecks();
```

```mdx
---
title: Welcome
---

# Welcome
```

アプリに router を mount すると `/decks/welcome` で表示できます。

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "../decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
```

1.x から移行する場合は [MIGRATION.md](MIGRATION.md#日本語) を参照してください。

## API の考え方

`hono-decks.config.ts` はビルド専用です。CLI と Vite plugin だけが読み、Worker は import しません。compiler は `mountPath` を asset URL と生成モジュールに埋め込むため、`decks.mountPath` は常にコンパイル時の値です。別のパスに mount すると、壊れたリンクを返す代わりに明示的なエラーになります。

生成された `createDecks(options)` は、アプリで必要な操作をまとめた API を返します。

```ts
decks.mountPath;
decks.source;
decks.router();
decks.context();
decks.paths("welcome");
```

`decks.paths(slug)` は次を返します。

```ts
{
  viewer,
  render,
  print,
  overview,
  presentation,
  presenter,
  embed,
  exportPdf,
  exportPng,
  ogImage,
  assets,
}
```

custom viewer や route では文字列を連結せず、この path map または `DeckPageMeta.paths` を使います。

```ts
createDecks({
  viewer: {
    controls: {
      after: ({ meta }) => [
        { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
      ],
    },
  },
});
```

## Dev integration

通常の `dev` コマンドへ生成処理を統合します。Cloudflare WorkersではWranglerのcustom buildを使います。

```jsonc
// wrangler.jsonc
{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
```

これでdeck変更時に自動compileされます。ブラウザも自動更新するため、dev scriptでは`wrangler dev --live-reload`を使います。生成ファイルは dev・build・typecheck のたびに作り直されるため、`.hono-decks/` はGitで管理しません。

HonoXやViteを使う場合は `hono-decks init --framework hono`(または `honox`、`void`)を実行するか、pluginを追加します。pluginは生成モジュールをメモリ上に保持して `virtual:hono-decks` として公開し、ディスクには書き出しません。

```ts
// vite.config.ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

```ts
// src/decks.ts
/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks();
```

Vite pluginはcompile成功後にfull reloadを通知します。どちらも利用者が実行するコマンドは既存の `bun run dev` だけです。`hono-decks compile --watch` は独自ツールへ組み込む場合の低レベルな選択肢として残しています。

config を別名にした場合だけ `hono-decks compile --config path/to/config.ts` を使います。

## Runtime config

ランタイムのオプションは `createDecks()` に渡します。resolver はすべて object argument を1個受け取り、型パラメーターで Worker の binding を `c.env` に反映できます。

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

`decks.router(overrides)` のマージ規則は一つです。オブジェクトは再帰的にマージ、配列は連結し、それ以外の値(`false` や関数を含む)は置き換えます。機能を明示的に止める場合は `export: false`、`embed: false`、`presenter: false` を指定できます。

デッキが無い場合・本番での下書き・無効にしたページは、アプリの `notFound` ハンドラーに任せます。404 ページは `app.notFound()` で決められます。

`source` で生成済みの source を拡張できます。たとえば asset を R2 から配信する場合です。

```ts
import { withR2Assets } from "hono-decks";

export const decks = createDecks<AppEnv>({
  source: (source) => withR2Assets(source, { bucket: (c) => c.env.DECK_ASSETS }),
});
```

## Custom route

```ts
import type { DeckContextVariables } from "hono-decks";
import { decks } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  `${decks.mountPath}/:slug/about`,
  decks.context(),
  (c) => c.html(renderDetails({
    deck: c.var.deck,
    meta: c.var.deckMeta,
    toc: c.var.deckToc,
  })),
);
```

configured middleware は source、mount path、draft/dev policy を標準 router と共有します。

## Directory deck

```text
decks/product/
  deck.mdx
  theme.css
  assets/
    architecture.svg
  components/
    index.tsx
    client/
      index.tsx
```

- `theme.css`: deck 固有 style
- `assets/`: compile 時に public path へ書き換える local asset
- `components/index.tsx`: server component
- `components/client/index.tsx`: browser で hydrate する island component

## 既定スタイルを拡張する

hono-decks の既定の見た目は、2つのカスケードレイヤーにまとめています。`@layer hono-decks.base` はトークン・ページの既定値・スライド内の文字組み、`@layer hono-decks.components` は組み込みコンポーネントとビューアー・発表者画面・オーバービューの見た目です。レイヤー内のセレクターはすべて `:where()` で包んでいるため、詳細度は0です。`theme.css`、デッキのコンポーネントが出力する CSS、ルーターの `style` オプション、`viewer.style`、埋め込み先ページの CSS など、レイヤー外のルールであれば、`!important` やセレクターの追加なしに既定値を上書きできます。

```css
/* decks/product/theme.css: 単純なセレクターで十分です */
code {
  border-radius: 999px;
}
```

ビューアーはスライドの進捗を、スライド下端の高さ4pxのバーで表示します。現在の位置は `role="progressbar"` の値と、画面には表示しないテキストで支援技術に伝えます。`viewer.controls.progress` に `"count"` を指定すると「n / total」の数字表示、`"both"` でバーと数字の両方になります(既定は `"bar"`)。バーの色は `--hono-decks-viewer-progress-color` と `--hono-decks-viewer-progress-track` で変えられ、`viewer.controls.hidden: ["position"]` で進捗表示を非表示にできます。

スライドの重ね合わせ・切り替え・段階表示・キャンバスの拡大縮小・印刷レイアウトなど、動作に必要なルールはレイヤーに入れず、従来の詳細度のまま出力します。そのため、テーマに `.slide { position: relative; }` のような指定があっても表示の仕組みは壊れません。これらは `--hono-decks-transition-duration`、`--hono-decks-transition-easing`、`[data-fire-effect]` の `--fire-*` などのカスタムプロパティで調整します。

アプリ側の CSS もレイヤーを使っている場合(Tailwind CSS v4 など)は、hono-decks のスタイルより前にレイヤーの順序を宣言し、アプリのレイヤーを後ろに置いてください。

```css
@layer hono-decks, theme, base, components, utilities;
```

## Embed / export / print

外部 iframe は `embed` オプションで明示的に有効化し、`frameAncestors` に埋め込み元 origin を列挙します。

```ts
createDecks({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
});
```

PDF/PNG は Cloudflare Browser Rendering binding を `browser: ({ c }) => c.env.BROWSER` で返します。export control は `authorize` が通った request にだけ表示されます。

Viewer 上の `Cmd + P` / `Ctrl + P` は print route へ移動し、すべての slide を印刷対象にします。

## スライドのオーバービュー

`/:slug/overview` は、デッキのテーマのまま全スライドをサムネイルのグリッドで表示します。サムネイルを選ぶとそのスライドからビューアーで開き、ビューアーのグリッドボタンからは現在のスライドを強調した状態でオーバービューを開けます。`pages: { overview: false }` で無効化でき、ボタンだけを隠す場合は `viewer.controls.hidden: ["overview"]` を指定します。

## Build-time OGP images

`viewer.openGraph` を有効にすると、viewer は `decks.paths(slug).ogImage` を使って Open Graph / Twitter Card の絶対URLを出力します。画像生成ライブラリは core へ含めていません。

```ts
createDecks({
  viewer: { openGraph: true },
});
```

`examples/ogp` は Satori と resvg を example だけの依存として追加し、frontmatter から 1200×630 PNG をビルド時に生成して Workers Static Assets で配信するレシピです。Browser Rendering binding は不要です。`build.ogpCacheFile` はスライド内 LinkCard 用の外部メタデータキャッシュであり、この share image 生成とは別機能です。

### X(Twitter)の Player Card

`twitterPlayer` を指定すると、ポスト内でスライドを再生できる Player Card を出力します。カードはデッキの `embed` ルートを参照するため、`embed` も有効にしてください。hono-decks はそのルートの `frame-ancestors` に X のオリジンを自動で追加します。配信は HTTPS が必須です。

```ts
createDecks({
  embed: {},
  viewer: { openGraph: { twitterPlayer: true } }, // または { width: 1280, height: 720 }
});
```

X は Player Card の公式ドキュメントを公開しておらず、挙動が変わる可能性があります。[2026年10月の公開検証](https://thehouse.game/updates/2026-10-22-interactive-x-embeds)では、通常のポストは承認の手続きなしに Web 版でインライン表示されました。一方、X のモバイルアプリでは埋め込み URL がアプリ内ブラウザで開き、X の記事(Articles)ではプレーヤーが動きませんでした。画像だけを表示する環境もあるため、`ogImage` も用意しておいてください。X はカードを URL 単位でキャッシュします。タグを変えた後は、クエリ文字列を付けるなど別の URL で共有すると反映を確認できます。

## Public entries

- `hono-decks`: `defineDecksConfig`、ランタイムのオプションの型、customization、deck authoring
- `hono-decks/advanced`: raw router/source/renderer を組み立てる Worker-safe な低レベル API
- `hono-decks/client`: client island hydration
- `hono-decks/node`: Node 専用の compiler、config loader、local filesystem adapter
- `hono-decks/vite`: 開発中にデッキをcompile・監視する Vite integration
- `hono-decks/honox`: HonoX のルート連携(`virtual:hono-decks/honox` が使用)
- `hono-decks/cli`: programmatic CLI

通常は root entry と生成された `createDecks()` を使ってください。

```ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal", decksRouter({ source }));
```

advanced entry は独自 source や独自 pipeline を作る場合に限定します。

## Examples

- `examples/minimal`: standalone Worker の最小構成
- `examples/basic`: R2 assets、Browser Rendering、custom page、client components
- `examples/honox`: `virtual:hono-decks/honox` で HonoX の file route に router を追加
- `docs`: ドキュメントサイトと埋め込みデモ
- `examples/ogp`: Satori による browserless な build-time OGP 生成

各 example は、ビルド設定を `hono-decks.config.ts`、ランタイムのオプションをアプリのdecksモジュールに置く同じ構成です。Wrangler の example は `typecheck`・`test`・`dev`・`deploy` の前にデッキをcompileします。ルートで `bun run generate` を実行するとまとめてcompileできます。

## 開発への参加

```bash
bun install
bun run --cwd packages/decks test   # src に対する単体テスト(ビルド不要)
bun run check                       # 全体の検証(build、generate、lint＋format、typecheck、test)
```

各ワークスペースの typecheck と test は並列で実行します。公開ビルドを検査する `*.dist.test.ts` は `bun run --cwd packages/decks test:dist` で実行します。

## Cloudflare

copy 可能な Worker example は JSONC の Wrangler config、current compatibility date、`nodejs_compat`、`wrangler types` で生成した binding type を基準にします。secret は config の `vars` へ置かず `wrangler secret put` で登録してください。

ドキュメントの編集方法、コンポーネントの配置、サイト設定は[ドキュメントサイトのガイド](docs/README.md)を参照してください。

## Maintainer release flow

`main`に入ったConventional Commitsをもとに、GitHub Actionsが`hono-decks`をnpmへ公開します。semantic-releaseは最新のリリースタグと、それ以降のコミットから次のバージョンを決めます。`feat`はマイナー、`fix`と`perf`はパッチ、破壊的変更はメジャーリリースになります。`fix(ci)`はリリースの対象外です。PRでは`bun run check`を実行し、`main`のRelease workflowでは同じ確認と`bun run smoke:package:compat`を通した後に公開します。

破壊的変更を公開するときは、最終コミットのメッセージに`feat!:`（scope付きは`feat(scope)!:`）または`BREAKING CHANGE:` footerを残してください。squash mergeではPR本文だけでなく、最終的なコミットメッセージにこの指定があることを確認します。

リポジトリ内の`packages/decks/package.json`には、過去の公開バージョンが残る場合があります。semantic-releaseは公開用の作業環境でこの値を更新します。`scripts/verify-release-baseline.mjs`は、ソースに記載されたバージョンと同じタグが履歴にあることを確認します。タグがない場合、Release workflowは検証だけを行い、公開をスキップします。現在の公開版は[npm](https://www.npmjs.com/package/hono-decks)または[GitHub Releases](https://github.com/ts-76/hono-decks/releases)で確認してください。Release workflowでは、Vite 6・7・8との互換性を`bun run smoke:package:compat`で検証します。

ブラウザーとPDF出力の手動確認には、次のコマンドを使います。Release workflowでは`bun run check`と`bun run smoke:package:compat`を実行しますが、これらのブラウザー・PDFチェックは自動実行しません。両コマンドには`agent-browser`のChromium binaryが必要で、PDF previewの検証にはPopplerまたはmacOS Quick Lookも必要です。準備方法は[basic exampleのlocal smoke checks](examples/basic/README.md#local-smoke-checks)を参照してください。

```bash
bun run smoke:viewport
bun run smoke:pdf
```

ローカルの`smoke:pdf`は開発者環境のbrowserで`/print` surfaceをPDF化するチェックであり、`/export.pdf`やCloudflare Browser Runは呼びません。本番のexport routeは`BROWSER` bindingを使います。deploy済みまたはremote bindingのWorker経路を検証する場合は、originとexport tokenを設定してcredentialed smokeを実行してください。

```bash
export HONO_DECKS_BROWSER_RUN_ORIGIN=https://your-worker.example.com
export HONO_DECKS_BROWSER_RUN_TOKEN=your-export-token
bun run smoke:browser-run
```

このcredentialed checkにはdeploy済みまたはremote bindingのWorkerが必要なため、その環境を設定するまではgeneric CIやrelease validationには含めません。

credentialed validationを繰り返し実行する場合は、protectedな`browser-run-smoke` environmentに`HONO_DECKS_BROWSER_RUN_ORIGIN` variableと`HONO_DECKS_BROWSER_RUN_TOKEN` secretを設定し、`main`だけを対象にして`Browser Run smoke` workflowを手動起動してください。このworkflowは実際の`/export.pdf` routeを呼び、返却されたPDFをartifactとして保存します。local browserのinstallや実行は行いません。

次のコマンドブロックはmerge後にGitHub Actionsが実行する確認とrelease commandを示したものです。`bun run release`はmerge前のbrowser/PDF手動gateには含めません。

```bash
bun install --frozen-lockfile
bun run check
bun run smoke:package:compat
bun run release
```

新しい基準を作る場合は、`packages/decks/package.json` のversionを先に公開し、同じcommitへ対応するannotated tagを付けます。`npm publish` には npm account のloginと2FAが必要です。npmの `hono-decks` package settingsでは、GitHub ActionsのTrusted Publisherを次の内容で登録します。

- Organization or user: `ts-76`
- Repository: `hono-decks`
- Workflow filename: `release.yml`

以後は npm token を GitHub Secrets に置かず、GitHub OIDC と provenance で公開します。package version、npmの公開version、対応するGit tagは同じ基準に揃えてください。

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

デッキのフロントマターに `duration: 20m` を指定すると、発表時間の目安を表示します。`1h30m`、`90s`、分単位の数値も使えます。`createDecks({ presenter: { duration: 1200 } })` で上書きできます。こちらの数値は秒単位で、同じ文字列形式も使えます。タイマーはスライドの操作時または Start ボタンで開始します。`T` キーで開始・一時停止し、Reset でリセットします。経過時間と一時停止状態はプレゼンターのタブを再読み込みしても保持されます。目標時間がある場合は、残り時間とペースも表示します。ペースは、各スライドに目標時間を均等に割り当てた目安と比べて、予定どおり・先行・遅れのどれかを示します。
