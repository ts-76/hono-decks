# hono-slides

Hono + Cloudflare Workers で動く、MDX-like スライドデック runtime です。

## できること

- `---` 区切りの Markdown/MDX-like をスライドへ compile
- deck/slide frontmatter、presenter notes、MDX component metadata、asset refs、compile warnings を manifest として保持
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

Directory deck の `./assets/image.png` や `assets/image.png` は、Markdown image、slide background、built-in MDX component の asset-like props で public path に rewrite されます。`Hero` は built-in component として描画し、未知の MDX component は安全側で placeholder と compile warning に残します。

Frontmatter は scalar、inline array、複数行 list、shallow object、`|` block text を扱います。壊れた frontmatter 行は compile error にし、未知キーは `meta` に保持して compile warning にも載せます。

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

local file-based dev sample として、Node 側で `LocalDeckIO` / dev runtime / Hono router をまとめて配線する helper もあります。

```ts
import { serve } from "@hono/node-server";
import { createLocalDevSlidesApp } from "hono-slides/node";

const { app, stop } = await createLocalDevSlidesApp({
  cwd: process.cwd(),
  root: "decks",
  mountPath: "/slides",
});

serve({ fetch: app.fetch, port: 3000 });
process.once("SIGINT", () => stop());
```

この helper は `/slides` に dev router を mount し、`/slides/:slug/edit`、`/slides/:slug/save`、`/slides/:slug/events` を local files に接続します。production build では manifest compile + `manifestDeckSource()` を使う想定です。

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

development router の `agentChat` callback には `slug`, `sessionId`, `agentInstanceName`, `mode`, `baseMarkdownHash`, `sourcePath`, `markdown`, `instruction`, `activeSlide`, `useWorkersAI` が渡ります。`agentInstanceName` は deck slug と session id から生成されるため、会話履歴を deck/user session ごとに分けられます。

`SlideAssistant` は `@cloudflare/ai-chat` の `AIChatAgent` として実装しています。WebSocket chat client からは `/agents/slide-assistant/{deck-session}` に接続し、`useAgentChat` の request body に `slug`, `sessionId`, `markdown`, `sourcePath`, `baseMarkdownHash`, `activeSlide`, `slideCount` を渡せます。`/slides/:slug/agent/chat` は既存 viewer/editor 用の互換 JSON endpoint として残しています。

`mode: "code"` では Workers AI + Code Mode tool を試し、編集 proposal を返します。Agent chat は proposal を作るだけで保存は行いません。viewer ではユーザーが `Apply` / `Dismiss` を選び、`Apply` のときだけ Hono の `/apply` route が raw MDX に反映します。`AI` または `LOADER` binding がない場合、または model/tool 実行に失敗した場合は heuristic proposal に fallback します。WebSocket chat では `requestEditProposalApproval` client-side tool により、ブラウザ側で proposal approval UI を出す構成にできます。

`wrangler.toml` では Code Mode の worker loader を有効化しています。Workers AI を使う場合は `AI` binding を有効化してください。

```toml
[ai]
binding = "AI"
remote = true
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

## CLI: manifest compile

packaging/export 用には、local deck files から manifest module を生成できます。

```bash
bun run slides:compile -- --root decks --out src/generated/hono-slides-manifest.ts --mount /slides
```

同じ処理は package bin としても公開しています。

```bash
hono-slides compile --root decks --out src/generated/hono-slides-manifest.ts --mount /slides
```

- `--root` は deck root directory（例: `decks`）
- `--out` は生成する TypeScript manifest module
- `--mount` は local asset の public URL prefix

生成された manifest は `manifestDeckSource()` や `honoSlidesRouter()` の custom source に接続できます。

## 対応残件

現時点の実装は multi-deck routing、compiled manifest、dev editor、hot reload、Cloudflare Agent proposal の土台、packaging/export 向け manifest compile CLI までを対象にしています。次に残している主な対応は次の通りです。

- `route` frontmatter はまだ canonical slug には使いません。将来入れる場合も file-based slug の alias として扱い、衝突検出を追加します。
- 未知の MDX component は実行せず placeholder と warning として扱います。`Hero` 以外の built-in component や theme-driven renderer は今後の拡張です。
- remote/R2 asset は `AssetRef` と warning までを生成します。存在確認、署名 URL 化、R2 bucket 連携は custom `DeckSource` や配信側で実装します。
- production sample は閲覧 route のみです。R2/custom source sample は今後追加します。local file-based dev は `createLocalDevSlidesApp()` helper で最小 sample として扱えます。
- PDF export、remote control、share/QR、presenter view の別 route 化は初期実装の範囲外です。

## Sample 起動確認

同梱 Worker sample は、Hero component、viewer、development chat、editor/save を一通り触れる実用デモです。保存は起動中の in-memory sample deck に反映され、プロセスを再起動すると初期内容に戻ります。

```bash
bun run dev -- --port 8791
```

起動後に次の route を確認できます。

- `GET /` は `/decks` に redirect
- `GET /decks` は sample deck index
- `GET /decks/sample` は閲覧ページ、`GET /decks/sample/presentation` は固定キャンバスの presentation ページ
- `GET /decks/sample/edit` は sample deck editor
- `POST /decks/sample/agent/chat` は Cloudflare Agent chat。viewer chat では編集案を表示し、ユーザーが `Apply` した場合だけ `/decks/sample/apply` で保存します。`wrangler.toml` では Workers AI binding を `remote = true` で有効化しています。`bun run dev` は `HONO_SLIDES_USE_WORKERS_AI:true` で Workers AI を使います

## Quality

```bash
bun run check
```
