import type { Child } from "hono/jsx";
import { Callout, CodeBlock, RouteTable } from "./site";

interface Guide {
  title: string;
  description: string;
  content: Child;
}

const gettingStarted: Guide = {
  title: "はじめる",
  description: "MDX deck を compile し、generated router を既存の Hono application に mount します。",
  content: (
    <>
      <section id="overview">
        <h2>最小の構成</h2>
        <p>
          <code>@hono/decks</code> は monolithic な slide app ではありません。app-owned facade と generated entry
          を分け、Hono が mount path と middleware を所有します。
        </p>
        <CodeBlock
          label="Terminal"
          code={`bun add @hono/decks
bunx hono-decks init --out src/decks.ts
bunx hono-decks compile \\
  --root decks \\
  --out src/generated \\
  --mount /decks`}
        />
      </section>
      <section id="example">
        <h2>router を mount する</h2>
        <CodeBlock
          code={`// src/index.ts
import { Hono } from "hono"
import { createDecksRouter } from "./decks"

const app = new Hono()
app.route("/decks", createDecksRouter())

export default app`}
        />
        <p>
          <code>src/decks.ts</code> は編集してよい facade です。<code>src/generated/decks.ts</code> は compile
          が更新するため、app code から直接編集しません。
        </p>
      </section>
      <section id="notes">
        <h2>HonoX で使う</h2>
        <p>
          file route から generated router をそのまま export できます。現在の compile は明示 command
          なので、dev/build の前に実行してください。
        </p>
        <CodeBlock
          code={`// app/routes/decks/index.ts
import { createDecksRouter } from "../../decks"

export default createDecksRouter({ dev: true })`}
        />
        <Callout title="Runtime boundary">
          <p>
            Worker bundle では <code>@hono/decks</code> を import します。compiler と filesystem API は
            <code>@hono/decks/node</code> にだけ置かれています。
          </p>
        </Callout>
      </section>
    </>
  ),
};

const authoring: Guide = {
  title: "MDX deck を書く",
  description: "frontmatter、slide separator、local component、asset を build-time module に変換します。",
  content: (
    <>
      <section id="overview">
        <h2>deck は directory 単位</h2>
        <p>
          基本形は <code>decks/&lt;slug&gt;/deck.mdx</code> です。deck frontmatter は先頭に書き、水平線
          <code>---</code> で slide を分割します。
        </p>
        <CodeBlock
          label="MDX"
          code={`---
title: Hono at the edge
description: A route-first slide deck
transition: fade
---

# Hono at the edge

---
title: Runtime boundary
layout: statement
---

Node for I/O. Hono for routes.`}
        />
      </section>
      <section id="example">
        <h2>components と islands</h2>
        <p>
          <code>components/index.tsx</code> の named export は server component、
          <code>components/client/index.tsx</code> は island として生成されます。deck ごとの registry
          なので、別 deck の同名 component と衝突しません。
        </p>
        <CodeBlock
          code={`// decks/launch/components/index.tsx
export function Metric(props: { value: string; label: string }) {
  return <figure><strong>{props.value}</strong><figcaption>{props.label}</figcaption></figure>
}`}
        />
      </section>
      <section id="notes">
        <h2>assets と embeds</h2>
        <p>
          相対画像は generated asset URL へ変換されます。R2 配信は <code>withR2Assets()</code> で
          <code>DeckSource.getAsset()</code> 境界を包みます。外部 URL は明示的な Zenn 風 shorthand
          または built-in component を使います。
        </p>
        <CodeBlock
          label="MDX"
          code={`![Architecture](./assets/runtime-boundary.svg)

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[card](https://hono.dev/docs/)

<Fragment order={2}>Shown on the second step.</Fragment>`}
        />
      </section>
    </>
  ),
};

const routing: Guide = {
  title: "routes と UI を組み込む",
  description: "viewer、projection、presenter、export の責任範囲と request-aware な拡張点を整理します。",
  content: (
    <>
      <section id="overview">
        <h2>既定 route surface</h2>
        <RouteTable
          rows={[
            ["/", "公開 deck の index"],
            ["/:slug", "outer viewer と controls"],
            ["/:slug/render", "slide runtime iframe"],
            ["/:slug/presentation", "projection window"],
            ["/:slug/presenter", "speaker view"],
            ["/:slug/print", "print preview"],
          ]}
        />
      </section>
      <section id="example">
        <h2>request context で切り替える</h2>
        <p>
          <code>dev</code> は dev server から暗黙には渡りません。boolean または resolver を router
          option として明示します。
        </p>
        <CodeBlock
          code={`createDecksRouter({
  dev: (c) => c.env.ENVIRONMENT !== "production",
  presenter: {
    enabled: ({ c, deck }) => deck.meta.presenter === true && Boolean(c.env.PRESENTER_ENABLED),
    viewerControl: true,
  },
})`}
        />
      </section>
      <section id="notes">
        <h2>独自 page と extension</h2>
        <p>
          deck-aware な app-owned route は <code>deckContext()</code> で compiled deck、viewer parts、TOC、meta
          を受け取れます。router 内へ別 Hono app を mount する場合は <code>extensions</code> を使います。
        </p>
        <Callout title="URL state">
          <p>
            viewer / presentation / presenter は <code>?slide=2&amp;step=1</code> を共有します。pagination
            state を app 側の別 store へ複製する必要はありません。
          </p>
        </Callout>
      </section>
    </>
  ),
};

const security: Guide = {
  title: "document policy と security",
  description: "すべての HTML surface に request-scoped language、CSP nonce、head customization を適用します。",
  content: (
    <>
      <section id="overview">
        <h2>共通 document policy</h2>
        <p>
          <code>document</code> は index、viewer、render、print、presentation、presenter に共通で適用されます。
          値は request-aware resolver にでき、<code>surfaces</code> で個別に上書きできます。
        </p>
      </section>
      <section id="example">
        <h2>strict CSP と nonce</h2>
        <CodeBlock
          code={`createDecksRouter({
  document: {
    lang: ({ c }) => c.req.header("accept-language")?.startsWith("en") ? "en" : "ja",
    nonce: ({ c }) => c.get("secureHeadersNonce"),
    head: ({ surface }) => <meta name="hono-decks-surface" content={surface} />,
    surfaces: {
      presenter: { lang: "en" },
    },
  },
})`}
        />
        <p>
          解決した nonce は package が生成するすべての inline <code>&lt;style&gt;</code> と
          <code>&lt;script&gt;</code> に付与されます。CSP header 自体は Hono app の middleware で設定します。
        </p>
      </section>
      <section id="notes">
        <h2>external iframe embed</h2>
        <p>
          外部 blog から埋め込む場合、公開境界は CORS ではなく embed response の CSP
          <code>frame-ancestors</code> です。許可 origin を明示し、<code>X-Frame-Options</code> を同じ route
          で矛盾なく扱います。
        </p>
        <Callout title="Safe default">
          <p>
            通常 viewer や内部 <code>/render</code> を直接公開せず、<code>createDeckViewerEmbed()</code>
            だけを含む薄い document を app 側で返してください。
          </p>
        </Callout>
      </section>
    </>
  ),
};

const guides: Record<string, Guide> = {
  "getting-started": gettingStarted,
  authoring,
  routing,
  security,
};

export function getGuide(slug: string): Guide | undefined {
  return guides[slug];
}
