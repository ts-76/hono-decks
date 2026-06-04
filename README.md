# hono-slides

Hono + Cloudflare Workers で動く、MDX-like スライドデック runtime です。

## できること

- `---` 区切りの Markdown/MDX-like をスライドへ compile
- deck/slide frontmatter、presenter notes、MDX component placeholder、asset refs を manifest として保持
- `decks/deck1/deck.mdx` と `decks/deck1.mdx` の file-based routing
- production では slug route で閲覧と presentation controls のみを提供
- development では edit/save、hot reload、Agent chat、proposal apply を提供
- Cloudflare Agents と Workers AI Code Mode を使った編集 proposal の入口を提供

## Deck Files

Directory deck はローカル asset を同じ slug 配下で扱えます。

```txt
decks/
  deck1/
    deck.mdx
    assets/
      image.png
```

Single-file deck は remote/R2/public asset を前提にできます。

```txt
decks/
  deck2.mdx
```

`https://...`, `r2://...`, `/public/...` のような参照は manifest の `AssetRef` として保持します。deck frontmatter の `assets: [...]` からも同じ external/public/R2 refs を収集できます。remote/R2 の存在確認や署名 URL 化は custom `DeckSource` や配信側で扱うため、compile warning にも載せます。

Directory deck の `./assets/image.png` や `assets/image.png` は、Markdown image、slide background、MDX component placeholder の asset-like props 表示で public path に rewrite されます。

Frontmatter は scalar、inline array、複数行 list、shallow object、`|` block text を扱います。未知キーは `meta` に保持し、compile warning にも載せます。

同じ slug の `deck1.mdx` と `deck1/deck.mdx` は衝突として扱います。

`draft: true` の deck は production の index/direct viewing route から隠し、development router では表示します。

## Production Router

build 時に manifest を生成し、runtime では `DeckSource` から compiled deck を返します。

```ts
import { Hono } from "hono";
import { honoSlidesRouter, manifestDeckSource } from "hono-slides";
import { deckManifest } from "./generated/deck-manifest";

const app = new Hono();

app.route(
  "/slides",
  honoSlidesRouter({
    source: manifestDeckSource(deckManifest),
    dev: false,
  }),
);

export default app;
```

Node 側の I/O は build/dev に閉じます。

```ts
import { compileDecks } from "hono-slides/node";

await compileDecks({
  cwd: process.cwd(),
  root: "decks",
  mountPath: "/slides",
  out: "src/generated/deck-manifest.ts",
});
```

## Development Router

development では raw MDX の read/write/watch だけを `LocalDeckIO` に任せ、compile、preview event、HMR surface は Hono 側で扱います。

```ts
import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import {
  compileMarkdown,
  createCloudflareDeckAgentChat,
  createDevDeckRuntime,
  createPreviewEventHub,
  honoSlidesRouter,
} from "hono-slides";
import { buildDeckManifestFromFileSystem, createLocalDeckIO } from "hono-slides/node";

const cwd = process.cwd();
const localDeckIO = createLocalDeckIO({ cwd, root: "decks" });
const previewEvents = createPreviewEventHub();
const initial = await buildDeckManifestFromFileSystem({ cwd, root: "decks", mountPath: "/slides" });
const runtime = createDevDeckRuntime({
  initialDecks: initial.decks,
  localDeckIO,
  previewEvents,
  compiler: { compileMarkdown },
  mountPath: "/slides",
});

runtime.start();

const app = new Hono();
app.route(
  "/slides",
  honoSlidesRouter({
    source: runtime.source,
    dev: true,
    localDeckIO,
    previewEvents,
    onFileChange: runtime.handleFileChange,
    agentChat: createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest,
    }),
  }),
);
```

- `GET /slides/:slug` は閲覧画面
- `GET /slides/:slug/edit` は開発用 editor
- `POST /slides/:slug/save` は raw MDX 保存
- `GET /slides/:slug/events` は preview event stream
- `POST /slides/:slug/agent/chat` は Agent への chat/proposal request
- `POST /slides/:slug/apply` は proposal を raw MDX に適用

development の閲覧ページは同じ event stream を購読し、deck update 時に full reload します。

editor の Agent chat と Apply は textarea の現在値を送るため、保存前の内容にも提案を作成・適用できます。実際の永続化は `/apply` または `/save` 経由でだけ行われます。

## Cloudflare Agents

`SlideAssistant` Durable Object を export しています。

- `/agents/slide-assistant/{deck-session}/suggest`
- `/agents/slide-assistant/{deck-session}/chat`

development router の `agentChat` callback には `slug`, `sessionId`, `agentInstanceName`, `mode`, `baseMarkdownHash`, `sourcePath`, `markdown`, `instruction`, `activeSlide` が渡ります。`agentInstanceName` は deck slug と session id から生成されるため、会話履歴を deck/user session ごとに分けられます。

`mode: "code"` では Workers AI + Code Mode tool を試し、編集 proposal を返します。保存は行わず、`/apply` と `/save` だけが local file I/O を実行します。`AI` または `LOADER` binding がない場合、または model/tool 実行に失敗した場合は heuristic proposal に fallback します。

`wrangler.toml` では Code Mode の worker loader を有効化しています。Workers AI を使う場合は `AI` binding を有効化してください。

```toml
[ai]
binding = "AI"
```

## Legacy Middleware

単一 deck を route middleware として扱う `honoSlides()` も引き続き使えます。

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

## MDX-like Example

```md
---
title: Cover
layout: cover
---

# Hono Slides

<Hero title="Fast decks on Workers" />

---
title: Speaker Notes
notes: Keep this hidden in normal viewing.
---

## Slide 2

- Markdown bullets
- `code`
```

## Quality

```bash
npm run check
```
