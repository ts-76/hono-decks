# hono-decks

Hono と Cloudflare Workers 上で MDX のスライドを配信するためのライブラリです。ビルド時に MDX を TypeScript module へ変換し、Worker runtime ではファイルシステムや compiler を読み込みません。

## Quick start

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

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
- `decks.paths(slug)`: viewer、render、print、presentation、presenter、embed、export、assets の完全な route map

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

## Development watch

```bash
bunx hono-decks compile --watch
```

初回 compile 後、deck root と config file を監視します。MDX、deck-local component、asset、theme CSS の変更で再生成されます。別 terminal で `wrangler dev` や Vite を動かしてください。config の場所を変える場合だけ `--config path/to/config.ts` を指定します。

```json
{
  "scripts": {
    "decks:compile": "hono-decks compile",
    "decks:watch": "hono-decks compile --watch",
    "dev": "wrangler dev"
  }
}
```

## Runtime configuration

すべての resolver は1個の object argument を受け取ります。引数の順序を覚える必要がなく、将来 input が増えても callback の意味が崩れません。

```ts
interface AppEnv {
  Bindings: {
    ENVIRONMENT: string;
    BROWSER?: DeckBrowserRunBinding;
    DECK_EXPORT_TOKEN?: string;
  };
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
  router: {
    dev: ({ c }) => c.env.ENVIRONMENT !== "production",
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

`components/index.tsx` は server-side JSX component、`components/client/index.tsx` は browser で hydrate する component です。`theme.css` はその deck だけに適用されます。画像は compile 時に検出され、`mountPath` と slug を使った public URL に書き換えられます。

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

## Public entries

- `hono-decks`: config、configured kit の型、deck authoring、viewer/embed customization、source decorator
- `hono-decks/advanced`: `defineDecks()`、`decksRouter()`、`deckContext()`、raw renderer など独自 pipeline 用
- `hono-decks/client`: browser hydration
- `hono-decks/node`: compiler と Node filesystem adapter
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
