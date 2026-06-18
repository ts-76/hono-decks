# hono-decks

Hono + Cloudflare Workers で動く MDX slide runtime です。MDX を build-time に `hono/jsx` 向け module へ compile し、Worker runtime では生成済み router と slide module を普通の app code として bundle/import します。

このリポジトリは monorepo です。ライブラリ本体とサンプル Worker を分けています。

```txt
packages/
  decks/             # runtime, parser, compiler, router, CLI
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
- package だけ確認する場合は `bun run --cwd packages/decks check` を使います。
- sample だけ確認する場合は `bun run --cwd examples/basic check` を使います。

## Package

`packages/decks` が再利用するライブラリ本体です。

```ts
// src/index.ts
import { Hono } from "hono";
import { decksRouter } from "./generated/decks";

const app = new Hono();

app.route("/decks", decksRouter());
```

local deck files から generated router と slide module を生成する CLI も package 側にあります。ファイル読み取りと MDX compile は build-time に閉じ、Worker runtime は生成済み module を import します。

```bash
hono-decks compile \
  --root decks \
  --out src/generated \
  --mount /slides
```

生成される `src/generated/decks.ts` は利用側 entry です。通常は `decksRouter()` をそのまま mount します。

`decks/*/components/index.tsx` または `index.ts` の named export は deck-local component として取り込まれます。deck ごとに `MDXContent` へ component map を渡すため、複数 deck に同名の `<Badge />` があっても server render 側では衝突しません。

MDX は `@mdx-js/mdx` で build-time に compile されます。`import` / `export` / JavaScript expression は MDX の標準 model に従って生成済み module 内で実行され、Worker runtime で raw MDX string を `eval` することはありません。

```mdx
export const label = 'Rendered ' + 'by Hono JSX'

# Component Slide

<Badge label={label} />
```

client side interactivity が必要な component は island として出力し、ユーザー側の client bundle から `hono/jsx/dom` で hydrate します。

```tsx
import { useState } from "hono/jsx";
import { hydrateSlideIslands } from "@hono/decks/client";

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

hydrateSlideIslands({
  components: { Counter },
});
```

`style` と `clientEntry` は必要な deck だけ generated router に渡します。`style` は base presentation CSS に足すテーマ CSS、`clientEntry` は `client: true` な component を `hono/jsx/dom` で hydrate する browser bundle の接続口です。静的な server-rendered deck ではどちらも不要です。

```ts
app.route("/decks", decksRouter({
  style: `
    :root { --accent: #00e0ff; }
    .slide h1 { color: var(--accent); }
  `,
  clientEntry: "/assets/decks.client.js",
}));
```

## Basic Example

`examples/basic` は directory deck を package CLI で manifest 化し、Cloudflare Workers 上で表示する最小サンプルです。

```txt
examples/basic/
  decks/
    sample/
      deck.mdx
      components/
        index.tsx
  src/
    generated/
      decks.ts
      decks/
        sample/
          slide-0.ts
```

`dev`、`typecheck`、`test`、`deploy` は事前に `bun run decks:compile` を実行し、`decks/sample/deck.mdx` から `src/generated/decks.ts` と slide module 群を更新します。Worker runtime は生成済み router を import するだけで、file system の読み取りは build-time CLI に閉じています。

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

- domain model: `packages/decks/src/deck`
- parse: `packages/decks/src/parser`
- render: `packages/decks/src/renderer`
- client islands: `packages/decks/src/client`
- compile: `packages/decks/src/compiler`
- MDX module/router generation: `packages/decks/src/generator`
- manifest source adapter: `packages/decks/src/source`
- file routing: `packages/decks/src/routing`
- runtime/view: `packages/decks/src/server`, `packages/decks/src/runtime`
- Node-only local I/O: `packages/decks/src/node`

edit/agent 実装は MVP から外しています。後から戻しやすいように、view 側は `DeckSource` と router options を境界にしており、編集層は別 package や feature branch から差し込む想定です。

## Legacy Middleware

単一 deck を route middleware として扱う `deckMiddleware()` も使えます。

```ts
import { Hono } from "hono";
import { deckMiddleware } from "@hono/decks";

const app = new Hono();

app.use(
  "/deck",
  deckMiddleware({
    markdown: `# Hello\n\n---\n\n## Second`,
  }),
);
```

下流 handler で自分の API response にしたい場合は `respond: false` を使います。

```ts
app.post("/api/preview", deckMiddleware({ respond: false }), (c) => {
  return c.json({
    deck: c.var.slideDeck,
    html: c.var.slideHtml,
  });
});
```
