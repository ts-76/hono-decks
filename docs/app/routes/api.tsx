import type { Child } from "hono/jsx";
import { createRoute } from "honox/factory";
import { getLocale, localizedHref, type Locale } from "../i18n";
import { CodeBlock, DocsLayout, type PageSection } from "../site";

interface ApiDefinition {
  id: string;
  symbol: string;
  entry: "hono-decks" | "hono-decks/node" | "hono-decks/client";
  signature: string;
  description: { ja: string; en: string };
  guide: string;
  source: string;
  typeOnly?: boolean;
}

const runtimeDefinitions: ApiDefinition[] = [
  { id: "define-decks", symbol: "defineDecks", entry: "hono-decks", signature: "defineDecks(options: DecksOptions): DefinedDecks", description: { ja: "生成済みのマニフェストから、デッキの取得元とルーターを作成します。", en: "Creates a source and router factory from a generated manifest." }, guide: "/docs/getting-started", source: "server/define-decks.ts" },
  { id: "decks-router", symbol: "decksRouter", entry: "hono-decks", signature: "decksRouter(options: DecksRouterOptions): Hono", description: { ja: "DeckSourceを使って、一覧、ビューアー、発表者画面などのルートを作成します。", en: "Mounts a DeckSource across index, viewer, presenter, and other route surfaces." }, guide: "/docs/routing", source: "server/router.ts" },
  { id: "deck-context", symbol: "deckContext", entry: "hono-decks", signature: "deckContext(options: DeckContextOptions): MiddlewareHandler", description: { ja: "アプリ側のルートから、コンパイル済みデッキ、ビューアーの部品、目次、メタデータを参照できるようにします。", en: "Adds the compiled deck, viewer parts, TOC, and metadata to app-owned routes." }, guide: "/docs/routing", source: "server/router.ts" },
  { id: "define-decks-config", symbol: "defineDecksConfig", entry: "hono-decks", signature: "defineDecksConfig(config: DecksConfig): DecksConfig", description: { ja: "アプリ側の設定を、型を保ったまま定義します。", en: "Defines app-owned configuration while preserving its types." }, guide: "/docs/configuration", source: "server/define-decks.ts" },
  { id: "merge-router-options", symbol: "mergeDecksRouterOptions", entry: "hono-decks", signature: "mergeDecksRouterOptions(base, overrides): DecksRouterOptions", description: { ja: "基本設定と上書き設定を結合します。入れ子になった設定も保持されます。", en: "Merges base and application/request overrides across nested options." }, guide: "/docs/configuration", source: "server/define-decks.ts" },
];

const renderingDefinitions: ApiDefinition[] = [
  { id: "create-viewer-parts", symbol: "createDeckViewerParts", entry: "hono-decks", signature: "createDeckViewerParts(input: { deck; mountPath; controls?; exportPaths? }): Promise<DeckViewerParts>", description: { ja: "iframe、操作ボタン、目次、ページ情報を個別に取得します。", en: "Returns frame, controls, TOC, and page metadata as independent parts." }, guide: "/docs/routing", source: "server/viewer.ts" },
  { id: "create-viewer-embed", symbol: "createDeckViewerEmbed", entry: "hono-decks", signature: "createDeckViewerEmbed(input: DeckViewerEmbedOptions): Promise<DeckViewerEmbed>", description: { ja: "必要なCSSとスクリプトを含む埋め込み用ビューアーを作成します。", en: "Creates an embedded viewer with scoped CSS and runtime behavior." }, guide: "/docs/routing", source: "server/viewer.ts" },
  { id: "with-r2-assets", symbol: "withR2Assets", entry: "hono-decks", signature: "withR2Assets(source: DeckSource, options: R2AssetSourceOptions): DeckSource", description: { ja: "生成済みアセットをR2から取得するDeckSourceを作成します。", en: "Wraps generated assets with an R2-backed source." }, guide: "/docs/authoring", source: "source/r2-assets.ts" },
  { id: "define-slide-components", symbol: "defineSlideComponents", entry: "hono-decks", signature: "defineSlideComponents(input: Record<string, SlideComponentInput>): SlideComponentRegistry", description: { ja: "標準コンポーネントとアプリ独自のコンポーネントを型付きで登録します。", en: "Creates a typed registry for built-in and application components." }, guide: "/docs/authoring", source: "renderer/jsx-renderer.ts" },
  { id: "render-compiled-deck-async", symbol: "renderCompiledDeckAsync", entry: "hono-decks", signature: "renderCompiledDeckAsync(deck: CompiledDeck, input?): Promise<string>", description: { ja: "コンパイル済みデッキをHono JSXで描画します。非同期コンポーネントにも対応します。", en: "Renders a compiled deck to a Hono JSX surface with async component support." }, guide: "/docs/authoring", source: "renderer/compiled-render.ts" },
];

const typeDefinitions: ApiDefinition[] = [
  { id: "decks-router-pages-options", symbol: "DecksRouterPagesOptions", entry: "hono-decks", signature: "interface DecksRouterPagesOptions { index?; viewer?; render?; print?; presentation?; presenter? }", description: { ja: "一覧、ビューアー、印刷、発表画面などの表示をリクエストごとに設定します。", en: "Configures index rendering and HTML route surfaces per request." }, guide: "/docs/routing", source: "server/router.ts", typeOnly: true },
  { id: "deck-route-surface-input", symbol: "DeckRouteSurfaceInput", entry: "hono-decks", signature: "interface DeckRouteSurfaceInput { c; surface; mountPath; dev; deck?; slug? }", description: { ja: "各ルートを有効にするか判断する関数へ、Honoのコンテキスト、デッキ、公開パス、開発モードの値を渡します。", en: "Passes Hono context, deck, mount path, and dev state into route gates." }, guide: "/docs/routing", source: "server/router.ts", typeOnly: true },
  { id: "deck-document-options", symbol: "DeckDocumentOptions", entry: "hono-decks", signature: "interface DeckDocumentOptions extends DeckDocumentPageOptions { surfaces? }", description: { ja: "HTMLの言語、nonce、head要素と、画面ごとの上書きを定義します。", en: "Defines language, nonce, head content, and per-surface overrides." }, guide: "/docs/security", source: "server/document.ts", typeOnly: true },
  { id: "deck-external-embed-options", symbol: "DeckExternalEmbedOptions", entry: "hono-decks", signature: "interface DeckExternalEmbedOptions { frameAncestors?; document?; viewer? }", description: { ja: "外部サイトへ埋め込むためのページと許可するオリジンを設定します。", en: "Opts into an external iframe document route with explicit policy." }, guide: "/docs/security", source: "server/external-embed.ts", typeOnly: true },
  { id: "deck-source", symbol: "DeckSource", entry: "hono-decks", signature: "interface DeckSource { listDecks(c); getCompiledDeck(c, slug); getAsset?(c, slug, path) }", description: { ja: "デッキやアセットの取得方法を定義します。ローカル、R2などの保存先をルーターから分離できます。", en: "Separates runtime deck and asset access from storage implementations." }, guide: "/docs/routing", source: "deck/model.ts", typeOnly: true },
];

const nodeDefinitions: ApiDefinition[] = [
  { id: "compile-decks", symbol: "compileDecks", entry: "hono-decks/node", signature: "compileDecks(input: CompileDecksInput): Promise<DeckManifest>", description: { ja: "ファイルシステム上のデッキをコンパイルし、マニフェストとモジュールを出力します。", en: "Compiles filesystem decks and emits the manifest and generated modules." }, guide: "/docs/getting-started", source: "node/compile-decks.ts" },
  { id: "create-local-deck-io", symbol: "createLocalDeckIO", entry: "hono-decks/node", signature: "createLocalDeckIO(input: CreateLocalDeckIOInput): LocalDeckIO", description: { ja: "開発時に使う未変換デッキの読み書きを、実行時のDeckSourceから分離します。", en: "Keeps dev-only raw deck I/O separate from the runtime DeckSource." }, guide: "/docs/getting-started", source: "node/local-deck-io.ts" },
  { id: "hydrate-slide-islands", symbol: "hydrateSlideIslands", entry: "hono-decks/client", signature: "hydrateSlideIslands(input: HydrateSlideIslandsInput): void", description: { ja: "生成されたクライアントエントリーから、操作を伴うIslandを有効にします。", en: "Hydrates interactive islands from the generated client entry." }, guide: "/docs/authoring", source: "client/islands.ts" },
];

const sectionsByLocale: Record<Locale, PageSection[]> = {
  ja: [{ id: "runtime", label: "実行時API" }, { id: "rendering", label: "レンダリングと拡張" }, { id: "policy-types", label: "ドキュメントとモデルの型" }, { id: "build-client", label: "Node / client entry" }],
  en: [{ id: "runtime", label: "Runtime entry" }, { id: "rendering", label: "Rendering" }, { id: "policy-types", label: "Policy and model types" }, { id: "build-client", label: "Node and client entries" }],
};

const sourceBase = "https://github.com/ts-76/hono-slides/blob/main/packages/decks/src/";

function ApiDefinitionList({ definitions, locale }: { definitions: ApiDefinition[]; locale: Locale }) {
  return <div class="api-definition-list">{definitions.map((definition) => {
    const importStatement = `import ${definition.typeOnly ? "type " : ""}{ ${definition.symbol} } from "${definition.entry}"`;
    return <article class="api-definition" id={definition.id}>
      <header><h3><a href={`#${definition.id}`} aria-label={`${definition.symbol} permalink`}>{definition.symbol}</a></h3><code>{definition.entry}</code></header>
      <p>{definition.description[locale]}</p>
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
  const title = "Public API";
  const description = isJa ? "Workerで使う実行時APIと、コンパイルに使うNode.js向けAPIを分けて公開しています。" : "The public surface keeps Worker-safe runtime APIs separate from build-time Node APIs.";
  return c.render(
    <DocsLayout activePath="/api" title={title} description={description} sections={sectionsByLocale[locale]} locale={locale}>
      <aside class="version-note"><strong>hono-decks 0.1.0</strong><span>{isJa ? "このページはpackage.jsonのexportsと実装に基づいています。" : "This reference follows package exports and source."}</span></aside>
      <ApiSection id="runtime" title={isJa ? "実行時API" : "Runtime entry"} intro={isJa ? "HonoアプリやWorkerでは、hono-decksから読み込みます。" : "Import these from hono-decks in ordinary Hono and Worker code."}><ApiDefinitionList definitions={runtimeDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="rendering" title={isJa ? "レンダリングと拡張" : "Rendering and extension"} intro={isJa ? "標準UIの一部を使う、独自UIへ差し替える、アセットの取得元を変える場合に使います。" : "Decompose and extend the default UI or replace its asset source."}><ApiDefinitionList definitions={renderingDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="policy-types" title={isJa ? "ドキュメントとモデルの型" : "Document and model types"} intro={isJa ? "HTMLの共通設定や独自のDeckSourceを定義するための型です。" : "Core types for request-aware policy and custom sources."}><ApiDefinitionList definitions={typeDefinitions} locale={locale} /></ApiSection>
      <ApiSection id="build-client" title={isJa ? "Node / client entry" : "Node and client entries"} intro={isJa ? "ファイル操作とコンパイルはNode.js向けエントリー、Islandの有効化はクライアント向けエントリーから読み込みます。" : "Filesystem/compiler APIs live in the Node entry; hydration lives in the client entry."}><ApiDefinitionList definitions={nodeDefinitions} locale={locale} /></ApiSection>
    </DocsLayout>,
    { title, description, activePath: "/api" },
  );
});
