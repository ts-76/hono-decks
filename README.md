# hono-slides

Hono + Cloudflare Workers で動く Markdown/MDX slide runtime です。Markdown/MDX を build-time に manifest 化し、Worker runtime では `hono/jsx` component registry を使って描画します。

このリポジトリは monorepo です。ライブラリ本体とサンプル Worker を分けています。

```txt
packages/
  hono-slides/        # runtime, parser, compiler, router, CLI
examples/
  basic/              # basic Cloudflare Workers sample
```

## Commands

```bash
bun install
bun run check
bun run dev
```

- `bun run dev` は `examples/basic` の Worker sample を起動します。
- `bun run check` は package と sample の typecheck/test をまとめて実行します。
- package だけ確認する場合は `bun run --cwd packages/hono-slides check` を使います。
- sample だけ確認する場合は `bun run --cwd examples/basic check` を使います。

## Package

`packages/hono-slides` が再利用するライブラリ本体です。

```ts
import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { defineSlideComponents, honoSlidesRouter, manifestDeckSource } from "hono-slides";
import { deckManifest } from "./generated/deck-manifest";

const app = new Hono();
const components = defineSlideComponents({
  Badge: (props) =>
    jsx("p", {
      class: "badge",
      children: String(props.label),
    }),
});

app.route(
  "/slides",
  honoSlidesRouter({
    source: manifestDeckSource(deckManifest),
    components,
  }),
);

export default app;
```

local deck files から manifest module を生成する CLI も package 側にあります。ファイル読み取りと MDX parse は build-time に閉じ、Worker runtime は生成済み manifest を import します。

```bash
hono-slides compile --root decks --out src/generated/hono-slides-manifest.ts --mount /slides
```

MDX の JSX component は登録済み component のみ描画されます。`import` / `export` / JavaScript expression は実行せず warning として扱うため、Worker runtime に任意コード実行を持ち込みません。

```mdx
# Component Slide

<Badge label="Rendered by Hono JSX" />
```

client side interactivity が必要な component は island として出力し、ユーザー側の client bundle から `hono/jsx/dom` で hydrate します。

```tsx
import { useState } from "hono/jsx";
import { hydrateSlideIslands } from "hono-slides/client";

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

hydrateSlideIslands({
  components: { Counter },
});
```

## Basic Example

`examples/basic` は directory deck を package CLI で manifest 化し、Cloudflare Workers 上で表示する最小サンプルです。

```txt
examples/basic/
  decks/
    sample/
      deck.mdx
  src/
    generated/
      deck-manifest.ts
```

`dev`、`typecheck`、`test`、`deploy` は事前に `bun run slides:compile` を実行し、`decks/sample/deck.mdx` から `src/generated/deck-manifest.ts` を更新します。Worker runtime は生成済み manifest を import するだけで、file system の読み取りは build-time CLI に閉じています。

```bash
bun run --cwd examples/basic dev
```

起動後は次の route を確認できます。

- `GET /` は `/decks` に redirect
- `GET /decks` は deck index
- `GET /decks/sample` は viewer
- `GET /decks/sample/render` は固定キャンバスの render page

## Architecture

MVP では parse と view の層を中心にしています。`deck` は domain model に絞り、カテゴリの異なる処理は別ディレクトリに分けています。

- domain model: `packages/hono-slides/src/deck`
- parse: `packages/hono-slides/src/parser`
- render: `packages/hono-slides/src/renderer`
- client islands: `packages/hono-slides/src/client`
- compile: `packages/hono-slides/src/compiler`
- manifest generation: `packages/hono-slides/src/generator`
- manifest source adapter: `packages/hono-slides/src/source`
- file routing: `packages/hono-slides/src/routing`
- runtime/view: `packages/hono-slides/src/server`, `packages/hono-slides/src/runtime`
- Node-only local I/O: `packages/hono-slides/src/node`

edit/agent 実装は MVP から外しています。後から戻しやすいように、view 側は `DeckSource` と router options を境界にしており、編集層は別 package や feature branch から差し込む想定です。

## Legacy Middleware

単一 deck を route middleware として扱う `honoSlides()` も使えます。

```ts
import { Hono } from "hono";
import { honoSlides } from "hono-slides";

const app = new Hono();

app.use(
  "/deck",
  honoSlides({
    markdown: `# Hello\n\n---\n\n## Second`,
  }),
);
```

下流 handler で自分の API response にしたい場合は `respond: false` を使います。

```ts
app.post("/api/preview", honoSlides({ respond: false }), (c) => {
  return c.json({
    deck: c.var.slideDeck,
    html: c.var.slideHtml,
  });
});
```
