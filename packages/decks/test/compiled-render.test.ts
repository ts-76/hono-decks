import { describe, expect, it } from "vitest";
import { jsx } from "hono/jsx/jsx-runtime";
import { defineSlideComponents, renderCompiledDeck, renderCompiledDeckPage } from "../src/renderer/compiled-render";
import type { CompiledDeck } from "../src/deck/model";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", presenter: true, meta: {} },
  slides: [
    {
      index: 0,
      meta: { title: "Intro", layout: "cover", className: "hero", notes: "Say hello", meta: {} },
      html: "<h1>Intro</h1>",
      components: [],
      notes: "Say hello",
    },
    {
      index: 1,
      meta: { title: "Details", layout: "default", meta: {} },
      html: "<h2>Details</h2>",
      components: [],
    },
  ],
  assets: [],
  warnings: [{ code: "x-component", message: "Unsupported component" }],
} satisfies CompiledDeck;

describe("compiled deck rendering", () => {
  it("renders slides with stable presentation metadata", () => {
    const html = renderCompiledDeck(deck);

    expect(html).toContain('data-deck-slug="deck1"');
    expect(html).toContain('data-slide-index="0"');
    expect(html).toContain("layout-cover");
    expect(html).toContain("hero");
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain('class="speaker-notes" hidden');
    expect(html).toContain("Say hello");
  });

  it("renders slide transition frontmatter as stable DOM metadata", () => {
    const html = renderCompiledDeck({
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          meta: { ...deck.slides[0].meta, transition: "fade fast" },
        },
      ],
    });

    expect(html).toContain('data-transition="fade-fast"');
  });

  it("renders a full page as a clean presentation surface with warnings", () => {
    const html = renderCompiledDeckPage({ deck, mountPath: "/decks" });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Deck One</title>");
    expect(html).not.toContain('data-hono-decks-controls');
    expect(html).not.toContain('data-action="next"');
    expect(html).not.toContain('data-action="fullscreen"');
    expect(html).not.toContain('data-timer');
    expect(html).toContain('document.addEventListener("keydown"');
    expect(html).toContain("requestFullscreen");
    expect(html).toContain("data-presenter-mode");
    expect(html).toContain("data-overview-mode");
    expect(html).toContain("Unsupported component");
    expect(html).not.toContain("/edit");
  });

  it("keeps a 1920x1080 deck canvas and scales it inside the iframe viewport", () => {
    const html = renderCompiledDeckPage({ deck, mountPath: "/decks" });

    expect(html).toContain('class="hono-decks-stage"');
    expect(html).toContain('class="hono-decks-deck"');
    expect(html).toContain('data-hono-decks-deck');
    expect(html).toContain("--hono-decks-width:1920px");
    expect(html).toContain("--hono-decks-height:1080px");
    expect(html).toContain("html,body{margin:0;width:100%;height:100%;overflow:hidden}");
    expect(html).toContain(".hono-decks-stage{width:100vw;height:100vh");
    expect(html).toContain(".hono-decks-deck{display:grid;gap:1rem;padding:1rem;width:var(--hono-decks-width);height:var(--hono-decks-height)");
    expect(html).toContain("transform-origin:left top");
    expect(html).toContain("function fitDeck()");
    expect(html).toContain("Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT)");
    expect(html).toContain('deck.style.transform = "scale(" + scale + ")"');
    expect(html).toContain('window.addEventListener("resize", fitDeck)');
    expect(html).not.toContain("html,body{margin:0;width:var(--hono-decks-width);height:var(--hono-decks-height)");
  });

  it("rewrites local relative asset image sources to manifest public paths", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            html: '<img src="./assets/image.png" alt="Local" />',
          },
        ],
        assets: [
          {
            sourcePath: "decks/deck1/assets/image.png",
            publicPath: "/slides/deck1/assets/image.png",
            type: "local",
            contentType: "image/png",
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('src="/slides/deck1/assets/image.png"');
    expect(html).not.toContain('src="./assets/image.png"');
  });

  it("rewrites local relative Hero image sources to manifest public paths", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            html: '<section class="mdx-hero"><img src="./assets/hero.png" alt="Hero" /></section>',
            components: [
              {
                id: "deck1-0-0",
                name: "Hero",
                props: { image: "./assets/hero.png" },
                source: '<Hero image="./assets/hero.png" />',
              },
            ],
          },
        ],
        assets: [
          {
            sourcePath: "decks/deck1/assets/hero.png",
            publicPath: "/slides/deck1/assets/hero.png",
            type: "local",
            contentType: "image/png",
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('src="/slides/deck1/assets/hero.png"');
    expect(html).not.toContain('src="./assets/hero.png"');
  });

  it("renders slide background frontmatter with local asset public paths", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            meta: { ...deck.slides[0].meta, background: "./assets/bg.png" },
          },
        ],
        assets: [
          {
            sourcePath: "decks/deck1/assets/bg.png",
            publicPath: "/slides/deck1/assets/bg.png",
            type: "local",
            contentType: "image/png",
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('style="background-image:url(&quot;/slides/deck1/assets/bg.png&quot;)"');
  });

  it("renders registered Hono JSX components from compiled slide nodes", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Columns",
                props: { gap: "wide" },
                children: [
                  { type: "element", tag: "div", props: {}, children: [{ type: "text", value: "Left" }] },
                  { type: "element", tag: "div", props: {}, children: [{ type: "text", value: "Right" }] },
                ],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
      components: defineSlideComponents({
        Columns: (props) =>
          jsx("section", {
            class: `columns columns-${String(props.gap)}`,
            children: props.children,
          }),
      }),
    });

    expect(html).toContain('class="columns columns-wide"');
    expect(html).toContain("<div>Left</div>");
    expect(html).toContain("<div>Right</div>");
    expect(html).not.toContain("mdx-component");
  });

  it("renders the built-in CodeBlock component with stable code metadata", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "CodeBlock",
                props: { lang: "ts", filename: "worker.ts", highlight: "2" },
                children: [
                  {
                    type: "text",
                    value: "const app = new Hono()\napp.get('/', (c) => c.text('<ok>'))",
                  },
                ],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-code-block"');
    expect(html).toContain('data-lang="ts"');
    expect(html).toContain('data-filename="worker.ts"');
    expect(html).toContain('data-highlight="2"');
    expect(html).toContain('<figcaption class="hono-decks-code-caption">worker.ts</figcaption>');
    expect(html).toContain('<code class="language-ts" data-lang="ts">');
    expect(html).toContain("const app = new Hono()");
    expect(html).toContain("app.get(&#39;/&#39;, (c) =&gt; c.text(&#39;&lt;ok&gt;&#39;))");
    expect(html).not.toContain("mdx-component");
  });

  it("renders build-time highlighted CodeBlock HTML without escaping it", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "CodeBlock",
                props: {
                  lang: "ts",
                  filename: "worker.ts",
                  highlightedHtml:
                    '<pre class="shiki github-dark" tabindex="0"><code><span class="line"><span style="color:#79C0FF">const</span> app</span></code></pre>',
                },
                children: [{ type: "text", value: "const app = new Hono()" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-code-highlight"');
    expect(html).toContain('<pre class="shiki github-dark" tabindex="0">');
    expect(html).toContain('<span style="color:#79C0FF">const</span>');
    expect(html).not.toContain("&lt;pre class=&quot;shiki");
  });

  it("marks client slide components as islands and loads the configured client entry", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Counter",
                props: { label: "Clicks", client: true },
                children: [],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
      clientEntry: "/assets/slides.client.js",
      components: defineSlideComponents({
        Counter: {
          client: true,
          clientId: "Counter__deck1_abcd1234",
          component: (props) => jsx("button", { type: "button", children: String(props.label) }),
        },
      }),
    });

    expect(html).toContain('data-hono-decks-island="Counter__deck1_abcd1234"');
    expect(html).toContain('data-hono-decks-props="{&quot;label&quot;:&quot;Clicks&quot;}"');
    expect(html).toContain('<script type="module" src="/assets/slides.client.js"></script>');
    expect(html).toContain("<button type=\"button\">Clicks</button>");
  });

  it("serializes JSON client island props without dropping nested values", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Counter",
                props: {
                  label: "Clicks",
                  client: true,
                  values: [1, "two", true, null],
                  options: { step: 2, nested: { mode: "demo" } },
                  empty: null,
                },
                children: [],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
      components: defineSlideComponents({
        Counter: {
          client: true,
          clientId: "Counter__deck1_abcd1234",
          component: (props) => jsx("button", { type: "button", children: String(props.label) }),
        },
      }),
    });

    expect(html).toContain(
      'data-hono-decks-props="{&quot;label&quot;:&quot;Clicks&quot;,&quot;values&quot;:[1,&quot;two&quot;,true,null],&quot;options&quot;:{&quot;step&quot;:2,&quot;nested&quot;:{&quot;mode&quot;:&quot;demo&quot;}},&quot;empty&quot;:null}"',
    );
  });

  it("rejects non-JSON client island props with a clear component path", () => {
    class FancyValue {
      label = "fancy";
    }

    const invalidProps = [
      { prop: "onClick", value: () => "clicked", message: 'Client island prop "Counter.onClick" must be JSON-serializable; functions cannot be passed to the client.' },
      { prop: "icon", value: jsx("span", { children: "!" }), message: 'Client island prop "Counter.icon" must be JSON-serializable; JSX values cannot be passed to the client.' },
      { prop: "createdAt", value: new Date("2026-06-19T00:00:00.000Z"), message: 'Client island prop "Counter.createdAt" must be JSON-serializable; Date values must be converted to strings.' },
      { prop: "state", value: new FancyValue(), message: 'Client island prop "Counter.state" must be JSON-serializable; class instances are not supported.' },
    ];

    for (const { prop, value, message } of invalidProps) {
      expect(() =>
        renderCompiledDeckPage({
          deck: {
            ...deck,
            slides: [
              {
                ...deck.slides[0],
                nodes: [
                  {
                    type: "component",
                    name: "Counter",
                    props: { label: "Clicks", client: true, [prop]: value },
                    children: [],
                  },
                ],
              },
            ],
          },
          mountPath: "/slides",
          components: defineSlideComponents({
            Counter: {
              client: true,
              clientId: "Counter__deck1_abcd1234",
              component: (props) => jsx("button", { type: "button", children: String(props.label) }),
            },
          }),
        }),
      ).toThrow(message);
    }
  });
});
