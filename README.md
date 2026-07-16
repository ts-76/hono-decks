# hono-decks

Hono / Cloudflare Workers で MDX の slide deck を配信するための monorepo です。MDX は CLI で TypeScript module に変換され、Worker は生成済み module だけを読み込みます。

## 最短の導入

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

`init` は `hono-decks.config.ts` と `src/decks.ts` を作ります。

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

`decks/welcome/deck.mdx` を追加すると `/decks/welcome` で表示できます。

## API の考え方

`hono-decks.config.ts` は CLI と runtime の single source of truth です。compile 時の asset URL と `app.route()` に別々の mount path を書く必要はありません。

generated module が返す configured kit には、アプリで必要な操作がまとまっています。

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
router: {
  viewer: {
    controls: {
      after: ({ meta }) => [
        { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
      ],
    },
  },
}
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

これでdeck変更時に自動compileされます。ブラウザも自動更新するため、dev scriptでは`wrangler dev --live-reload`を使います。HonoXやViteを使う場合は同じVite configへpluginを追加します。

```ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

Vite pluginはcompile成功後にfull reloadを通知します。どちらも利用者が実行するコマンドは既存の `bun run dev` だけです。`hono-decks compile --watch` は独自ツールへ組み込む場合の低レベルな選択肢として残しています。

config を別名にした場合だけ `hono-decks compile --config path/to/config.ts` を使います。`root`、`outDir`、`mountPath` は config の `build` と top-level に置きます。

## Runtime config

resolver はすべて object argument を1個受け取ります。

```ts
import {
  defineDecksConfig,
  type DeckBrowserRunBinding,
} from "hono-decks";

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

`decks.router(overrides)` は config を保ったまま nested options を合成します。機能を明示的に止める場合は `export: false`、`embed: false`、`presenter: false` を指定できます。

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

## Embed / export / print

外部 iframe は `router.embed` で明示的に有効化し、`frameAncestors` に埋め込み元 origin を列挙します。

```ts
router: {
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
}
```

PDF/PNG は Cloudflare Browser Rendering binding を `browser: ({ c }) => c.env.BROWSER` で返します。export control は `authorize` が通った request にだけ表示されます。

Viewer 上の `Cmd + P` / `Ctrl + P` は print route へ移動し、すべての slide を印刷対象にします。

## Build-time OGP images

`router.viewer.openGraph` を有効にすると、viewer は `decks.paths(slug).ogImage` を使って Open Graph / Twitter Card の絶対URLを出力します。画像生成ライブラリは core へ含めていません。

```ts
router: {
  viewer: { openGraph: true },
}
```

`examples/ogp` は Satori と resvg を example だけの依存として追加し、frontmatter から 1200×630 PNG をビルド時に生成して Workers Static Assets で配信するレシピです。Browser Rendering binding は不要です。`build.ogpCacheFile` はスライド内 LinkCard 用の外部メタデータキャッシュであり、この share image 生成とは別機能です。

## Public entries

- `hono-decks`: `defineDecksConfig`、configured kit の型、customization、deck authoring
- `hono-decks/advanced`: raw router/source/renderer を組み立てる低レベル API
- `hono-decks/client`: client island hydration
- `hono-decks/node`: compiler / local filesystem adapter
- `hono-decks/cli`: programmatic CLI

通常は root entry と generated `createDecks(config)` を使ってください。

```ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal", decksRouter({ source }));
```

advanced entry は独自 source や独自 pipeline を作る場合に限定します。

## Examples

- `examples/minimal`: standalone Worker の最小構成
- `examples/basic`: R2 assets、Browser Rendering、custom page、client components
- `examples/honox`: HonoX route への mount
- `examples/ogp`: Satori による browserless な build-time OGP 生成
- `docs`: documentation site と embedded demo

各 example は同じ `hono-decks.config.ts` contract を使います。`decks:compile`、`typecheck`、`test`、`deploy` の前に generated modules を更新します。

## Cloudflare

copy 可能な Worker example は JSONC の Wrangler config、current compatibility date、`nodejs_compat`、`wrangler types` で生成した binding type を基準にします。secret は config の `vars` へ置かず `wrangler secret put` で登録してください。

## Maintainer release flow

`main` へ入った Conventional Commits をもとに、GitHub Actions が `hono-decks` を npm へ公開します。`feat`、`fix`、`perf`、破壊的変更はいずれも 0.x の minor release として扱います。CI は pull request で `bun run check`、Release workflow は `main` で同じ確認を通した後に semantic-release を実行します。

初回だけは npm package と release tag の基準がないため、`0.3.0` を手動で登録します。基準 tag がない間、Release workflow は検証だけを行い、公開を安全にスキップします。

```bash
bun install --frozen-lockfile
bun run check
cd packages/decks
npm publish --access public
cd ../..
git tag -a v0.3.0 -m "hono-decks v0.3.0"
git push origin v0.3.0
```

`npm publish` には npm account の login と 2FA が必要です。公開後、npm の `hono-decks` package settings で GitHub Actions の Trusted Publisher を次の内容で登録します。

- Organization or user: `ts-76`
- Repository: `hono-slides`
- Workflow filename: `release.yml`

以後は npm token を GitHub Secrets に置かず、GitHub OIDC と provenance で公開します。tag は必ず実際に `0.3.0` を公開した commit に付けてください。
