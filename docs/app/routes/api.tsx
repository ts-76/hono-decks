import { createRoute } from "honox/factory";
import { DocsLayout, RouteTable } from "../site";

export default createRoute((c) =>
  c.render(
    <DocsLayout
      activePath="/api"
      title="Public API"
      description="Worker-safe な標準 entry と、build-time Node entry の境界を保った公開 surface です。"
    >
      <section id="overview">
        <h2>Runtime entry</h2>
        <p>
          通常の Hono / Worker code は <code>@hono/decks</code> から import します。parser、MDX compiler、filesystem
          依存は含まれません。
        </p>
        <RouteTable
          rows={[
            ["defineDecks()", "generated manifest から source と router を作る"],
            ["decksRouter()", "DeckSource を route surface へ mount する"],
            ["deckContext()", "app-owned route に deck context を渡す"],
            ["defineDecksConfig()", "app-owned configuration の型を固定する"],
            ["mergeDecksRouterOptions()", "base と request/application overrides を合成する"],
          ]}
        />
      </section>
      <section id="example">
        <h2>Rendering and extension</h2>
        <RouteTable
          rows={[
            ["createDeckViewerParts()", "frame、controls、TOC、meta を個別に取得"],
            ["createDeckViewerEmbed()", "scoped CSS と runtime を含む埋め込み viewer"],
            ["DeckExternalEmbedOptions", "安全な外部 iframe document route を opt-in で構成"],
            ["DecksRouterPagesOptions", "index rendering と HTML route surface を request 単位で構成"],
            ["DeckRouteSurfaceInput", "route gate に context、deck、mount path、dev state を渡す"],
            ["withR2Assets()", "generated asset を R2-backed source で包む"],
            ["defineSlideComponents()", "built-in / app components の registry を作る"],
            ["renderCompiledDeckAsync()", "compiled deck を Hono JSX surface へ render"],
          ]}
        />
      </section>
      <section id="notes">
        <h2>Document and model types</h2>
        <p>
          custom source と document policy に必要な <code>CompiledDeck</code>、<code>DeckEntry</code>、
          <code>CompiledSlide</code>、<code>DeckFrontmatter</code>、<code>DeckSource</code>、
          <code>DeckDocumentOptions</code>、<code>DeckDocumentRenderInput</code>、viewer control item types は標準
          entry から named import できます。
        </p>
        <p>
          local file I/O、compiler、manifest generator、CLI integration は <code>@hono/decks/node</code> を使います。
          旧単一 Markdown API の <code>deckMiddleware</code> も Node entry だけで公開します。browser island hydration
          helper は <code>@hono/decks/client</code> です。
        </p>
      </section>
    </DocsLayout>,
    {
      title: "Public API",
      description: "@hono/decks runtime, document, viewer, and compiler entrypoint reference",
      activePath: "/api",
    },
  ),
);
