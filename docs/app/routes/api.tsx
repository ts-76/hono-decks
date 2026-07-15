import type { Child } from "hono/jsx";
import { createRoute } from "honox/factory";
import { getLocale, localizedHref, type Locale } from "../i18n";
import { CodeBlock, DocsLayout, type PageSection } from "../site";

interface ApiDefinition {
  id: string;
  symbol: string;
  entry: "hono-decks" | "hono-decks/advanced" | "hono-decks/node" | "hono-decks/client";
  signature: string;
  description: { ja: string; en: string };
  when: { ja: string; en: string };
  guide: string;
  source: string;
  typeOnly?: boolean;
}

const runtimeDefinitions: ApiDefinition[] = [
  { id: "define-decks-config", symbol: "defineDecksConfig", entry: "hono-decks", signature: "defineDecksConfig(config: DecksConfig): DecksConfig", description: { ja: "CLIとruntimeが共有する設定を型付きで定義します。", en: "Defines the shared CLI and runtime configuration." }, when: { ja: "mount path、build input、runtime policyを1ファイルへまとめるとき。", en: "Keeping mount path, build input, and runtime policy in one file." }, guide: "/docs/configuration", source: "server/define-decks.ts" },
  { id: "configured-decks", symbol: "ConfiguredDecks", entry: "hono-decks", signature: "interface ConfiguredDecks { mountPath; source; router(); context(); paths(slug) }", description: { ja: "生成されたcreateDecks(config)が返すアプリ向けkitです。", en: "The application kit returned by generated createDecks(config)." }, when: { ja: "route、custom page、URLを同じconfigから利用するとき。", en: "Using routes, custom pages, and URLs from one config." }, guide: "/docs/getting-started", source: "server/define-decks.ts", typeOnly: true },
  { id: "create-deck-paths", symbol: "createDeckPaths", entry: "hono-decks", signature: "createDeckPaths(mountPath, slug): DeckPaths", description: { ja: "1デッキの全公開URLを生成します。", en: "Creates every public URL for one deck." }, when: { ja: "configured kit外でpath mapが必要なとき。", en: "Creating a path map outside a configured kit." }, guide: "/docs/routing", source: "server/paths.ts" },
  { id: "decks-router", symbol: "decksRouter", entry: "hono-decks/advanced", signature: "decksRouter(options: DecksRouterOptions): Hono", description: { ja: "独自DeckSourceから低レベルrouterを構築します。", en: "Builds a low-level router from a custom DeckSource." }, when: { ja: "generated workflowを使わず独自pipelineを作るとき。", en: "Building a custom pipeline without generated createDecks(config)." }, guide: "/docs/routing", source: "server/router.ts" },
];

const renderingDefinitions: ApiDefinition[] = [
  { id: "create-viewer-parts", symbol: "createDeckViewerParts", entry: "hono-decks/advanced", signature: "createDeckViewerParts(input): Promise<DeckViewerParts>", description: { ja: "viewer部品を個別に取得します。", en: "Returns viewer parts independently." }, when: { ja: "標準viewerを使わず独自layoutを組むとき。", en: "Composing a fully custom viewer layout." }, guide: "/docs/routing", source: "server/viewer.ts" },
  { id: "create-viewer-embed", symbol: "createDeckViewerEmbed", entry: "hono-decks", signature: "createDeckViewerEmbed(input: DeckViewerEmbedOptions): Promise<DeckViewerEmbed>", description: { ja: "必要なCSSとスクリプトを含む埋め込み用ビューアーを作成します。", en: "Creates an embedded viewer with scoped CSS and runtime behavior." }, when: { ja: "独自ページ内へビューアーを直接組み込むとき。外部iframeルートの設定はembedオプションを使います。", en: "Embedding a viewer directly in a custom page. Use the router embed option for an external iframe route." }, guide: "/docs/routing", source: "server/viewer.ts" },
  { id: "with-r2-assets", symbol: "withR2Assets", entry: "hono-decks", signature: "withR2Assets(source: DeckSource, options: R2AssetSourceOptions): DeckSource", description: { ja: "生成済みアセットをR2から取得するDeckSourceを作成します。", en: "Wraps generated assets with an R2-backed source." }, when: { ja: "MDXの相対パスを変えずに、画像などの配信元をCloudflare R2へ移すとき。", en: "Moving generated asset delivery to Cloudflare R2 without changing relative MDX paths." }, guide: "/docs/authoring", source: "source/r2-assets.ts" },
  { id: "define-slide-components", symbol: "defineSlideComponents", entry: "hono-decks", signature: "defineSlideComponents(input: Record<string, SlideComponentInput>): SlideComponentRegistry", description: { ja: "標準コンポーネントとアプリ独自のコンポーネントを型付きで登録します。", en: "Creates a typed registry for built-in and application components." }, when: { ja: "複数デッキへ共通のコンポーネントを登録、または標準コンポーネントを差し替えるとき。デッキ固有の部品はcomponents/に置きます。", en: "Registering shared components across decks or replacing built-ins. Keep deck-specific components under components/." }, guide: "/docs/authoring", source: "renderer/jsx-renderer.ts" },
  { id: "render-compiled-deck-async", symbol: "renderCompiledDeckAsync", entry: "hono-decks/advanced", signature: "renderCompiledDeckAsync(deck: CompiledDeck, input?): Promise<string>", description: { ja: "コンパイル済みデッキを直接描画します。", en: "Renders a compiled deck directly." }, when: { ja: "低レベルの独自render pipelineを作るとき。", en: "Building a low-level custom rendering pipeline." }, guide: "/docs/authoring", source: "renderer/compiled-render.ts" },
];

const typeDefinitions: ApiDefinition[] = [
  { id: "deck-viewer-open-graph-options", symbol: "DeckViewerOpenGraphOptions", entry: "hono-decks", signature: "interface DeckViewerOpenGraphOptions { imagePath?: string | (({ deck, paths }) => MaybePromise<string | undefined>) }", description: { ja: "viewerのOpen GraphとTwitter Card画像を、標準パスまたはresolverで設定します。", en: "Configures the viewer's Open Graph and Twitter Card image from the canonical path or a resolver." }, when: { ja: "ビルド時に生成したOGP画像や外部CDNの画像をviewerのsocial metadataへ接続するとき。", en: "Connecting a build-generated or CDN-hosted image to viewer social metadata." }, guide: "/docs/configuration", source: "server/viewer.ts", typeOnly: true },
  { id: "decks-router-pages-options", symbol: "DecksRouterPagesOptions", entry: "hono-decks", signature: "interface DecksRouterPagesOptions { index?; viewer?; render?; print?; presentation?; presenter? }", description: { ja: "一覧、ビューアー、印刷、発表画面などの表示をリクエストごとに設定します。", en: "Configures index rendering and HTML route surfaces per request." }, when: { ja: "不要な公開画面を無効化する、または認証や環境に応じて表示を切り替えるとき。", en: "Disabling unused public surfaces or gating them by authentication and environment." }, guide: "/docs/routing", source: "server/router.ts", typeOnly: true },
  { id: "deck-route-surface-input", symbol: "DeckRouteSurfaceInput", entry: "hono-decks", signature: "interface DeckRouteSurfaceInput { c; surface; mountPath; dev; deck?; slug? }", description: { ja: "各ルートを有効にするか判断する関数へ、Honoのコンテキスト、デッキ、公開パス、開発モードの値を渡します。", en: "Passes Hono context, deck, mount path, and dev state into route gates." }, when: { ja: "pagesの判定関数を別ファイルに定義し、入力型を明示するとき。", en: "Typing a reusable pages resolver defined outside the router configuration." }, guide: "/docs/routing", source: "server/router.ts", typeOnly: true },
  { id: "deck-document-options", symbol: "DeckDocumentOptions", entry: "hono-decks", signature: "interface DeckDocumentOptions extends DeckDocumentPageOptions { surfaces? }", description: { ja: "HTMLの言語、nonce、head要素と、画面ごとの上書きを定義します。", en: "Defines language, nonce, head content, and per-surface overrides." }, when: { ja: "すべての生成HTMLへlang、CSP nonce、head要素を一括適用するとき。", en: "Applying lang, CSP nonce, or head elements to every generated HTML surface." }, guide: "/docs/security", source: "server/document.ts", typeOnly: true },
  { id: "deck-external-embed-options", symbol: "DeckExternalEmbedOptions", entry: "hono-decks", signature: "interface DeckExternalEmbedOptions { frameAncestors?; document?; viewer? }", description: { ja: "外部サイトへ埋め込むためのページと許可するオリジンを設定します。", en: "Opts into an external iframe document route with explicit policy." }, when: { ja: "別オリジンのサイトへデッキをiframeで埋め込み、許可先とビューアーを設定するとき。", en: "Embedding decks on another origin with explicit parent origins and viewer settings." }, guide: "/docs/security", source: "server/external-embed.ts", typeOnly: true },
  { id: "deck-source", symbol: "DeckSource", entry: "hono-decks", signature: "interface DeckSource { listDecks(c); getCompiledDeck(c, slug); getAsset?(c, slug, path) }", description: { ja: "デッキやアセットの取得方法を定義します。ローカル、R2などの保存先をルーターから分離できます。", en: "Separates runtime deck and asset access from storage implementations." }, when: { ja: "生成済みマニフェスト以外からデッキを取得する、または保存先を独自実装するとき。", en: "Loading decks outside the generated manifest or implementing a custom storage source." }, guide: "/docs/routing", source: "deck/model.ts", typeOnly: true },
];

const nodeDefinitions: ApiDefinition[] = [
  { id: "compile-decks", symbol: "compileDecks", entry: "hono-decks/node", signature: "compileDecks(input: CompileDecksInput): Promise<DeckManifest>", description: { ja: "ファイルシステム上のデッキをコンパイルし、マニフェストとモジュールを出力します。", en: "Compiles filesystem decks and emits the manifest and generated modules." }, when: { ja: "独自のビルドスクリプトやプラグインからコンパイラーを呼ぶとき。通常はCLIのhono-decks compileを使います。", en: "Calling the compiler from a custom build script or plugin. Most projects use the hono-decks compile CLI." }, guide: "/docs/getting-started", source: "node/compile-decks.ts" },
  { id: "create-local-deck-io", symbol: "createLocalDeckIO", entry: "hono-decks/node", signature: "createLocalDeckIO(input: CreateLocalDeckIOInput): LocalDeckIO", description: { ja: "開発時に使う未変換デッキの読み書きを、実行時のDeckSourceから分離します。", en: "Keeps dev-only raw deck I/O separate from the runtime DeckSource." }, when: { ja: "デッキ編集・プレビュー機能を持つ独自の開発ツールを作るとき。通常の配信コードでは使いません。", en: "Building custom deck editing or preview tooling. It does not belong in ordinary runtime code." }, guide: "/docs/getting-started", source: "node/local-deck-io.ts" },
  { id: "hydrate-slide-islands", symbol: "hydrateSlideIslands", entry: "hono-decks/client", signature: "hydrateSlideIslands(input: HydrateSlideIslandsInput): void", description: { ja: "生成されたクライアントエントリーから、操作を伴うIslandを有効にします。", en: "Hydrates interactive islands from the generated client entry." }, when: { ja: "独自のクライアント配信パイプラインを構築するとき。通常は生成されたエントリーが自動で呼び出します。", en: "Building a custom client delivery pipeline. The generated client entry normally calls it for you." }, guide: "/docs/authoring", source: "client/islands.ts" },
];

const sectionsByLocale: Record<Locale, PageSection[]> = {
  ja: [{ id: "start", label: "最初に読む" }, { id: "runtime", label: "実行時API" }, { id: "rendering", label: "レンダリングと拡張" }, { id: "policy-types", label: "設定とモデルの型" }, { id: "build-client", label: "Node / client entry" }],
  en: [{ id: "start", label: "Start here" }, { id: "runtime", label: "Runtime entry" }, { id: "rendering", label: "Rendering" }, { id: "policy-types", label: "Policy and model types" }, { id: "build-client", label: "Node and client entries" }],
};

const sourceBase = "https://github.com/ts-76/hono-slides/blob/main/packages/decks/src/";

function ApiDefinitionList({ definitions, locale }: { definitions: ApiDefinition[]; locale: Locale }) {
  return <div class="api-definition-list">{definitions.map((definition) => {
    const importStatement = `import ${definition.typeOnly ? "type " : ""}{ ${definition.symbol} } from "${definition.entry}"`;
    return <article class="api-definition" id={definition.id}>
      <header><h3><a href={`#${definition.id}`}>{definition.symbol}</a></h3><code>{definition.entry}</code></header>
      <p>{definition.description[locale]}</p>
      <p class="api-when"><strong>{locale === "ja" ? "使う場面" : "Use it when"}</strong><span>{definition.when[locale]}</span></p>
      <CodeBlock label="Import + signature" code={`${importStatement}\n\n${definition.signature}`} locale={locale} />
      <nav aria-label={`${definition.symbol} links`}>
        <a href={localizedHref(definition.guide, locale)}>{locale === "ja" ? "関連ガイド" : "Guide"} →</a>
        <a href={`${sourceBase}${definition.source}`}>{locale === "ja" ? "ソース" : "Source"} ↗</a>
      </nav>
    </article>;
  })}</div>;
}

function ApiSection({ id, title, intro, children }: { id: string; title: string; intro: string; children: Child }) {
  return <section id={id}><h2>{title}</h2><p>{intro}</p>{children}</section>;
}

export default createRoute((c) => {
  const locale = getLocale(c);
  const isJa = locale === "ja";
  const title = isJa ? "APIリファレンス" : "API reference";
  const description = isJa ? "まず利用するエントリーを選び、その後で目的に合う関数や型を探せるように整理しています。" : "Choose the correct package entry first, then find the function or type for the task at hand.";
  return c.render(
    <DocsLayout activePath="/api" title={title} description={description} sections={sectionsByLocale[locale]} locale={locale}>
      <aside class="version-note"><strong>hono-decks 0.3.0</strong><span>{isJa ? "アプリが直接選ぶ主要APIを、package.jsonのexportsと実装に基づいて説明します。" : "This page explains the primary APIs applications choose directly, based on package exports and source."}</span></aside>
      <section id="start">
        <h2>{isJa ? "通常は生成されたcreateDecks(config)から始める" : "Most applications start with generated createDecks(config)"}</h2>
        <p>{isJa ? <>導入手順で作る<code>src/decks.ts</code>が、生成物と公開APIの境界になります。デッキを表示するだけなら、このページの低レベルAPIを直接組み合わせる必要はありません。</> : <>The <code>src/decks.ts</code> facade created in the getting-started guide is the boundary between generated modules and public APIs. You do not need to compose low-level APIs just to render a deck.</>}</p>
        <dl class="configuration-map">
          <div><dt><code>hono-decks</code></dt><dd>{isJa ? "HonoアプリとWorkerで使う実行時API。通常はこちらを使います。" : "Worker-safe runtime APIs for Hono applications. This is the normal entry."}</dd></div>
          <div><dt><code>hono-decks/advanced</code></dt><dd>{isJa ? "独自source、router、rendererを組み立てる低レベルAPI。" : "Low-level APIs for custom sources, routers, and renderers."}</dd></div>
          <div><dt><code>hono-decks/node</code></dt><dd>{isJa ? "ファイル読み込みとコンパイル用。ビルド処理だけで使い、Workerへimportしません。" : "Filesystem and compiler APIs for builds only. Never import this entry in Worker runtime code."}</dd></div>
          <div><dt><code>hono-decks/client</code></dt><dd>{isJa ? "Islandの有効化用。通常は生成されたクライアントコードが使用します。" : "Island hydration. Generated client code normally uses it for you."}</dd></div>
        </dl>
        <p><a class="text-link" href={localizedHref("/docs/getting-started", locale)}>{isJa ? "導入手順から始める" : "Start with the getting-started guide"} →</a></p>
      </section>
      <ApiSection id="runtime" title={isJa ? "実行時API" : "Runtime entry"} intro={isJa ? "HonoアプリやWorkerではhono-decksから読み込みます。各項目の「使う場面」を確認し、生成済みファサードで足りない場合だけ直接使ってください。" : "Import these from hono-decks in Hono and Worker code. Read each use case and reach for the direct API only when the generated facade is not enough."}><ApiDefinitionList definitions={runtimeDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="rendering" title={isJa ? "レンダリングと拡張" : "Rendering and extension"} intro={isJa ? "標準UIの一部を使う、独自UIへ差し替える、アセットの取得元を変える場合に使います。" : "Decompose and extend the default UI or replace its asset source."}><ApiDefinitionList definitions={renderingDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="policy-types" title={isJa ? "設定とモデルの型" : "Configuration and model types"} intro={isJa ? "公開画面、HTMLの共通設定、独自のDeckSourceを型付きで定義するときに使います。" : "Types for public surfaces, shared HTML policy, and custom DeckSource implementations."}><ApiDefinitionList definitions={typeDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="build-client" title={isJa ? "Node / client entry" : "Node and client entries"} intro={isJa ? "ファイル操作とコンパイルはNode.js向けエントリー、Islandの有効化はクライアント向けエントリーから読み込みます。" : "Filesystem/compiler APIs live in the Node entry; hydration lives in the client entry."}><ApiDefinitionList definitions={nodeDefinitions} locale={locale} /></ApiSection>
    </DocsLayout>,
    { title, description, activePath: "/api" },
  );
});
