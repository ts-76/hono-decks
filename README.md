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

コードブロックは compile 時に Shiki で highlight され、生成済み slide module に HTML として埋め込まれます。Worker runtime は highlighter を読み込まず、生成済み HTML を render するだけです。fenced code と built-in `<CodeBlock>` のどちらも使えます。

````mdx
```ts
const app = new Hono()
```

<CodeBlock lang="ts" filename="worker.ts" highlight="2">
const app = new Hono()
app.get("/", (c) => c.text("ok"))
</CodeBlock>
````

client side interactivity が必要な component は island として出力します。`decks/*/components/client/index.tsx` の named export は compile 時に browser bundle へ取り込まれ、`hydrateSlideIslands()` の registry は自動生成されます。同名 component が複数 deck にあっても、生成時に stable hash 付き id を割り当てるため client hydration 側でも衝突しません。生成された `decksRouter()` は browser bundle を mount 配下の `/_assets/client.js` で自動配信するため、通常はアプリ側で client entry の route を手で書く必要はありません。

```tsx
import { useState } from "hono/jsx/dom";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

ローカル画像を R2 に置いて Worker 経由で配信したい場合は、生成済み `decks.source` を `withR2Assets()` で包みます。MDX 側は `./assets/image.png` のまま書けます。compile で生成される `/decks/:slug/assets/...` URL は維持し、R2 binding がある環境では R2 object を返し、無い環境では生成済み local asset にフォールバックします。

```tsx
import { Hono } from "hono";
import { withR2Assets, type R2BucketLike } from "@hono/decks";
import { decks, decksRouter } from "./generated/decks";

const app = new Hono<{
  Bindings: {
    DECK_ASSETS?: R2BucketLike;
  };
}>();

const source = withR2Assets(decks.source, {
  bucket: (c) => c.env.DECK_ASSETS,
  cacheControl: "public, max-age=31536000, immutable",
});

app.route("/decks", decksRouter({ source }));
```

この package は R2 upload までは行いません。`withR2Assets()` は `decks/sample/assets/image.png` のような generated asset の `sourcePath` を R2 key として読むため、deploy 前に同じ key で object を置いてください。ローカル test では `Cache-Control` header と R2 binding 経由の response を検証できますが、Cloudflare edge cache の hit/miss は deploy 後に `cf-cache-status` や `age` を見る smoke check で確認します。

iframe embed は built-in `<EmbedFrame>` を使えます。`sandbox`、`allow`、`referrerpolicy`、`loading="lazy"`、fallback link、aspect ratio の既定値を package 側で揃えます。YouTube など特定サービスで必要な permission は `allow` で上書きしてください。

```mdx
<EmbedFrame
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  title="YouTube embed example"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
>
Open YouTube embed
</EmbedFrame>
```

SNS や X のような script-based embed は built-in `<SocialEmbed>` で link-first にできます。package は third-party script を自動挿入しないため、Worker SSR と CSP を壊さずに引用テキストと外部リンクを表示できます。

```mdx
<SocialEmbed
  href="https://x.com/honojs/status/123"
  provider="x"
  author="@honojs"
  label="Open on X"
>
Script-based SNS embeds stay link-first by default.
</SocialEmbed>
```

`@hono/decks` は標準 viewer に Content-Security-Policy header を設定しません。アプリ側で CSP を設定する場合、iframe embed は `frame-src`、画像は `img-src`、client entry は `script-src` の対象になります。X widgets などの third-party script を使いたい場合は custom viewer route で明示的に script と CSP を足し、標準 deck content には `<SocialEmbed>` の fallback を残す構成を推奨します。

`style` は必要な deck だけ generated router に渡します。`style` は `/:slug/render` の presentation document に足すテーマ CSS です。`clientEntry` は独自の asset pipeline や CDN から browser bundle を配信したい場合だけ使う外部URL override です。静的な server-rendered deck ではどちらも不要です。

```ts
app.route("/decks", decksRouter({
  style: `
    :root { --accent: #00e0ff; }
    .slide h1 { color: var(--accent); }
  `,
}));
```

`/:slug` の viewer shell は `viewer` で調整できます。`viewer.style` は iframe を包む slug page 用の簡易 raw CSS で、slide document には入りません。Hono JSX や `hono/css` を使いたい場合は `viewer.head` に head 要素を渡します。

```tsx
import { css, Style } from "hono/css";

const viewerStyle = css`
  [data-hono-decks-viewer] { background: #050816; }
`;

app.route("/decks", decksRouter({
  viewer: {
    controls: false,
    head: <Style>{viewerStyle}</Style>,
    render: ({ frame, toc, controls }) => (
      <main>
        <aside>{toc}</aside>
        {frame}
        {controls}
      </main>
    ),
  },
}));
```

標準 router ではなく deck-aware な独自ページやAPIを作る場合は `deckContext()` を使います。details、embed、analytics、OGP meta などに必要な deck 情報と viewer parts を `c.var` から参照できます。

```tsx
import { deckContext, type DeckContextVariables } from "@hono/decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get("/decks/:slug/embed", deckContext({ source: decks.source }), (c) => {
  return c.html(`
    <main>
      <title>${c.var.deckMeta.title}</title>
      ${c.var.deckViewer.frameHtml}
    </main>
  `);
});
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
        client/
          index.tsx
  src/
    generated/
      client-entry.ts
      decks.ts
      decks/
        sample/
          slide-0.ts
```

`dev`、`typecheck`、`test`、`deploy` は事前に `bun run decks:compile` を実行し、`decks/sample/deck.mdx` から `src/generated/decks.ts` と slide module 群を更新します。sample ではさらに deck-local な `decks/sample/components/client/index.tsx` を browser bundle 化して `src/generated/client-entry.ts` に埋め込み、`client: true` component を `hono/jsx/dom` で hydrate します。Worker runtime は生成済み router/client asset を import するだけで、file system の読み取りは build-time CLI に閉じています。

今後 sample で検証する media、embed、code block、animation、accessibility、export などの項目は [Verification Matrix](docs/verification-matrix.md) にまとめています。

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
