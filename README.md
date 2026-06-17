# hono-slides

Hono + Cloudflare Workers で動く Markdown/MDX-like slide runtime です。

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
import { honoSlidesRouter, manifestDeckSource } from "hono-slides";
import { deckManifest } from "./generated/deck-manifest";

const app = new Hono();

app.route(
  "/slides",
  honoSlidesRouter({
    source: manifestDeckSource(deckManifest),
  }),
);

export default app;
```

local deck files から manifest module を生成する CLI も package 側にあります。

```bash
bun run slides:compile -- --root decks --out src/generated/hono-slides-manifest.ts --mount /slides
```

## Basic Example

`examples/basic` は in-memory deck を Cloudflare Workers 上で表示する最小サンプルです。

```bash
bun run --cwd examples/basic dev
```

起動後は次の route を確認できます。

- `GET /` は `/decks` に redirect
- `GET /decks` は deck index
- `GET /decks/sample` は viewer
- `GET /decks/sample/render` は固定キャンバスの render page

## Architecture

MVP では parse と view の層を中心にしています。

- parse/compile: `packages/hono-slides/src/deck`
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
