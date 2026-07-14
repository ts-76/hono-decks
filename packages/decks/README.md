# @hono/decks

Markdown/MDX-like slide decksをHonoアプリへ組み込むroute kitです。deckのcompileはbuild時に行い、Cloudflare Workersなどのruntimeでは生成済みHono JSX moduleを配信します。

## Install

```bash
bun add @hono/decks
bunx hono-decks init --out src/decks.ts
```

deckを作成してcompileします。

```text
decks/
  sample/
    deck.mdx
    theme.css
```

```bash
bunx hono-decks compile --root decks --out src/generated --mount /decks
```

生成されたrouterをHonoへmountします。

```ts
import { Hono } from "hono";
import { createDecksRouter } from "./decks";

const app = new Hono();
app.route("/decks", createDecksRouter());

export default app;
```

標準routerはdeck index、viewer、render、print、presentation、presenter、asset routeを提供します。

リポジトリには用途別のexampleがあります。

- `examples/minimal`: 通常のHono Workerへrouterをmountする最小構成
- `examples/honox`: HonoXのfile-based routeからrouterをmountする構成
- `examples/basic`: R2、custom components、presenter、export、外部embedを含む総合例

## App-owned facade

`hono-decks init`が生成する`src/decks.ts`は編集してよいapp-owned facadeです。`src/generated/decks.ts`以下はcompileのたびに上書きされるため、アプリのrouteや設定から直接importせずfacadeの内側に閉じ込めます。

標準entryの`@hono/decks`はruntime-safeなroute kitだけを公開し、生成されるserver moduleもこのentryを直接importします。Markdown/MDXのparser、compiler、generatorは`@hono/decks/node`へ分離され、Hono WorkerやVite SSRの依存graphには入りません。

```ts
import type { DecksRouterOverrides } from "@hono/decks";
import { decks } from "./generated/decks";

export const deckSource = decks.source;

export function createDecksRouter(options: DecksRouterOverrides = {}) {
  return decks.router({ source: deckSource, ...options });
}
```

`decks.router(overrides)`はnested optionsを合成します。viewer、controlsのlabels/attributes、presenter、exportの一部だけを上書きしても、指定していない既存設定は維持されます。独自facadeでbase configとrequest-time overrideを合成する場合は`mergeDecksRouterOptions(base, overrides)`を使えます。

## Viewer customization

軽微な変更からmarkup全体の差し替えまで段階的に設定できます。

```tsx
app.route("/decks", createDecksRouter({
  viewer: {
    lang: "ja",
    style: `[data-hono-decks-viewer] { background: #f1f5f9; }`,
    controls: {
      className: "app-controls",
      itemClassName: "app-control",
      hidden: ["fullscreen"],
      labels: { previous: "戻る", next: "進む" },
      before: [{ type: "link", href: "/", label: "Home", icon: "home" }],
      after: (context) => [
        { type: "link", href: `${context.meta.canonicalPath}/about`, label: "Details" },
      ],
    },
  },
}));
```

- `before` / `after`: 標準controlsの前後に項目を追加
- `hidden`: 標準項目を非表示
- `labels`: 標準項目の表示を変更
- `items(defaults, context)`: controls全体を並べ替え・差し替え
- `renderItem(item, context, renderDefault)`: 標準動作を維持してmarkupだけ変更
- `{ type: "render" }`: 任意のHono JSXを追加
- `viewer.render`: viewer layout全体を変更
- `viewer.style` / `viewer.head`: viewer document専用のCSS/head要素を追加

`viewer.render`、関数形式の`viewer.head`、`viewer.lang`、`viewer.nonce`にはHono `Context`を含むinputが渡ります。認証状態、tenant、locale、CSP nonceなどrequest単位の値を利用できます。`viewer.nonce`はpackageが生成するinline styleとviewer runtime scriptの両方へ適用されます。

```tsx
type AppEnv = { Bindings: { LOCALE: string; TENANT: string; CSP_NONCE: string } };

app.route("/decks", createDecksRouter({
  viewer: {
    lang: ({ c }) => c.env.LOCALE,
    nonce: ({ c }) => c.env.CSP_NONCE,
    head: ({ c }) => <meta name="tenant" content={c.env.TENANT} />,
    render: ({ c, frame, controls, toc }) => (
      <main data-tenant={c.env.TENANT}>
        <aside>{toc}</aside>
        {frame}
        {controls}
      </main>
    ),
  },
}));
```

### Shared document policy

index、viewer、render、print、presentation、presenterを同じlanguage/CSP policyで揃える場合はrouterの`document`を使います。`lang`、`nonce`、`head`はrequest-aware resolverにでき、`surfaces`で特定pageだけを上書きできます。解決したnonceはpackageが生成するすべてのinline `<style>` / `<script>`へ付与されます。CSP header自体はapp側のHono middlewareで設定してください。

```tsx
app.route("/decks", createDecksRouter({
  document: {
    lang: ({ c }) => c.env.LOCALE,
    nonce: ({ c }) => c.get("secureHeadersNonce"),
    head: ({ surface }) => <meta name="deck-surface" content={surface} />,
    surfaces: {
      presenter: { lang: "en" },
    },
  },
}));
```

`DeckDocumentRenderInput`は`c`、`surface`、`deck`、`slug`、`mountPath`、`title`を持ちます。既存の`viewer.lang` / `viewer.nonce` / `viewer.head`は互換性のため残り、viewer surfaceでは共有`document`より優先されます。

## Embedding in the same document

`createDeckViewerEmbed()`はiframe、controls、scoped CSS、操作runtimeをまとめた自己完結viewerを返します。同じdocumentへ複数配置でき、各viewerのcontrols、swipe、keyboard、fullscreen、TOC、slide state messageは対応するiframeだけにscopedされます。

```tsx
import { createDeckViewerEmbed, deckContext, type DeckContextVariables } from "@hono/decks";
import { deckSource } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  "/decks/:slug/embed",
  deckContext({ source: deckSource, mountPath: "/decks" }),
  async (c) => {
    const viewer = await createDeckViewerEmbed({
      deck: c.var.deck,
      mountPath: "/decks",
      controls: false,
      toc: true,
      className: "article-deck",
      style: `.article-deck { max-width: 60rem; }`,
    });

    return c.html(<article>{viewer.embed}</article>);
  },
);
```

文字列templateでは`viewer.embedHtml`を使えます。低レベルに組み立てたい場合は`createDeckViewerParts()`が`frame` / `frameHtml` / `controls` / `controlsHtml` / `toc` / metadataを返します。低レベルpartsだけでは操作runtimeとCSSは追加されないため、完成した埋め込みには`createDeckViewerEmbed()`を使用してください。

### Embedding from an external blog

別ドメインのブログからは、通常viewerや内部`/render`ではなく、routerの`embed` optionが生成する薄い`/:slug/embed` documentをiframeで読み込みます。外側のiframeが公開境界、内側の`/render` iframeがslideの隔離境界になります。`embed`はopt-inで、許可originを省略した場合も`frame-ancestors 'self'`から広がりません。

```tsx
app.route("/decks", createDecksRouter({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    document: {
      lang: "ja",
      nonce: ({ c }) => c.get("secureHeadersNonce"),
      head: <meta name="robots" content="noindex" />,
    },
    viewer: {
      controls: false,
      className: "article-deck",
    },
  },
}));
```

`frameAncestors`、`enabled`、`viewer`はrequest-aware resolverにできます。`frameAncestors`のURLはHTTP(S) originへ正規化され、invalid valueは無視されます。generated responseは既存CSPの他directiveを維持しながら`frame-ancestors`を置き換え、矛盾する`X-Frame-Options`を除去します。`pageStyle`、`robots`、`document.head`、`render({ viewer })`でdocumentを調整できます。nonceはouter documentと埋め込みviewer内のすべてのinline style/scriptへ適用されます。

ブログ側は生成したURLを通常のiframeとして配置します。

```html
<iframe
  src="https://slides.example.com/decks/sample/embed"
  title="Sample presentation"
  loading="lazy"
  allow="fullscreen"
  style="width:100%;aspect-ratio:16/9;border:0"
></iframe>
```

iframe navigationにCORSは不要です。公開可否はembed responseのCSP `frame-ancestors`で制御します。ブログ側にCSPがある場合は`frame-src https://slides.example.com`も許可してください。認証付きdeckはthird-party cookie制限の影響を受けるため、公開deckまたはcookieに依存しない認証方式を推奨します。完全な設定例は`examples/basic/src/decks.config.ts`にあります。

## Typed Cloudflare bindings

Env genericを指定すると`DeckSource`、R2 resolver、`dev`、presenter、viewer、export callbackまでBindings型が伝播します。

```ts
import { defineDecksConfig, type DeckSource } from "@hono/decks";

interface AppEnv {
  Bindings: {
    DECK_RUNTIME_DEV?: string;
    DECK_EXPORT_TOKEN?: string;
    BROWSER?: { quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>): Promise<Response> };
  };
}

export default defineDecksConfig<AppEnv>({
  source(source: DeckSource<AppEnv>) {
    return source;
  },
  router: {
    dev: (c) => c.env.DECK_RUNTIME_DEV === "true",
    export: {
      authorize: (c) => Boolean(c.env.DECK_EXPORT_TOKEN),
      browser: (c) => c.env.BROWSER,
      pdf: true,
    },
  },
});
```

`DeckSource` callbackはHono request/response helpersとtyped `env`を持つ`DeckRequestContext`を受け取ります。Context variablesの異なる親アプリから同じsourceを安全に再利用できます。

## Custom pages with deckContext

`deckContext()`は独自details、analytics、OGP、embed routeへdeck情報を渡します。

```tsx
app.get("/decks/:slug/about", deckContext({ source: deckSource, mountPath: "/decks" }), (c) => {
  return c.json({
    title: c.var.deckMeta.title,
    slides: c.var.deckToc,
    renderUrl: c.var.deckViewer.renderUrl,
  });
});
```

利用できるvariablesは`deck`、`deckViewer`、`deckToc`、`deckMeta`です。draft filteringとmount pathの計算は標準routerと共有されます。

## Deck source composition

Runtimeは`DeckSource`だけに依存します。manifest以外のstorage、認可、cache、asset配信をdecoratorとして追加できます。

```ts
import { withR2Assets } from "@hono/decks";

const source = withR2Assets(decks.source, {
  bucket: (c) => c.env.DECK_ASSETS,
  cacheControl: "public, max-age=31536000, immutable",
});
```

`DeckSource`、build-timeの`DeckCompiler`、Node開発環境の`LocalDeckIO`は独立した境界です。Worker runtimeへfilesystem処理を持ち込みません。

## Deck themes and components

`decks/<slug>/theme.css`または`decks/<slug>/styles/index.css`を置くと、そのdeckのrender/print documentだけにCSSが挿入されます。両方ある場合はcompile errorです。

```css
:root {
  --hono-decks-color: #111827;
  --hono-decks-accent-color: #0369a1;
  --hono-decks-card-background: #ffffff;
}
```

server componentは`decks/<slug>/components/index.tsx`、client islandは`components/client/index.tsx`のnamed exportとして追加できます。client component registryとbrowser bundleはcompile時に生成され、routerが`/_assets/client.js`を配信します。

## Presenter and exports

`presenter.enabled`はrequest単位でspeaker notes routeをgateできます。

```ts
presenter: {
  enabled: ({ c, dev }) => dev || c.env.IS_PRESENTER === "true",
  viewerControl: true,
}
```

PDF/PNG exportはCloudflare Browser Rendering bindingを使うopt-in機能です。`export.authorize`がfalseのrequestではviewer linkを表示せず、直接アクセスには403を返します。

```ts
export: {
  authorize: (c) => c.req.header("authorization") === `Bearer ${c.env.DECK_EXPORT_TOKEN}`,
  browser: (c) => c.env.BROWSER,
  pdf: true,
  png: true,
}
```

## Entry points

- `@hono/decks`: generated server moduleとWorker/SSRアプリコードが使うruntime-safeなroute kit
- `@hono/decks/client`: client island hydration
- `@hono/decks/node`: parser、compiler、generator、filesystem、local development、OGP取得
- `@hono/decks/cli`: CLI API
- `hono-decks`: command line binary

Worker/SSRコードは`@hono/decks`、build-timeのNode処理は`@hono/decks/node`からimportします。

## Verification

```bash
bun run check
bun pm pack --dry-run
```

最小構成は`examples/minimal`、HonoX統合は`examples/honox`、全機能を使う構成は`examples/basic`を参照してください。
