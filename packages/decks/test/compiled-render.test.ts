import { describe, expect, it } from "vitest";
import { jsx } from "hono/jsx/jsx-runtime";
import {
  defineSlideComponents,
  renderCompiledDeck,
  renderCompiledDeckPage,
  renderCompiledDeckPageAsync,
} from "../src/renderer/compiled-render";
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
          meta: { ...deck.slides[0].meta, transition: "fade" },
        },
      ],
    });

    expect(html).toContain('data-transition="fade"');
  });

  it("renders explicit Fragment components with stable fragment attributes", async () => {
    const html = await renderCompiledDeckPageAsync({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Fragment",
                props: { order: 2 },
                children: [{ type: "text", value: "Second reveal" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain("data-hono-decks-fragment");
    expect(html).toContain('data-fragment-order="2"');
    expect(html).toContain("Second reveal");
  });

  it("renders Fragment effects as stable fire metadata", async () => {
    const html = await renderCompiledDeckPageAsync({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Fragment",
                props: { order: 2, effect: "fade-up" },
                children: [{ type: "text", value: "Animated reveal" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain("data-hono-decks-fragment");
    expect(html).toContain('data-fragment-order="2"');
    expect(html).toContain('data-fire-effect="fade-up"');
    expect(html).toContain("[data-fire-effect=fade-up][data-fragment-hidden]");
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
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

  it("publishes step state and advances fragments before slides", async () => {
    const html = await renderCompiledDeckPageAsync({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "Fragment",
                props: { order: 1 },
                children: [{ type: "text", value: "First reveal" }],
              },
            ],
          },
          deck.slides[1],
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain("[data-hono-decks-fragment]");
    expect(html).toContain("data-fragment-hidden");
    expect(html).toContain("let stepIndex = 0");
    expect(html).toContain("let stepCount = 0");
    expect(html).toContain(
      'window.parent.postMessage({ type: "hono-decks:state", index, stepIndex, stepCount, slideCount: slides.length }, "*")',
    );
    expect(html).toContain("function next()");
    expect(html).toContain("function previous()");
    expect(html).toContain("if (stepIndex < stepCount)");
    expect(html).toContain("updateFragments(stepIndex + 1)");
    expect(html).toContain("show(index + 1, 0)");
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
    expect(html).toContain(".hono-decks-deck{display:grid;gap:1rem;width:var(--hono-decks-width);height:var(--hono-decks-height)");
    expect(html).toContain(".slide{box-sizing:border-box;aspect-ratio:16/9");
    expect(html).toContain("transform-origin:left top");
    expect(html).toContain("function fitDeck()");
    expect(html).toContain("Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT)");
    expect(html).toContain('deck.style.transform = "scale(" + scale + ")"');
    expect(html).toContain('window.addEventListener("resize", fitDeck)');
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
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

  it("applies trusted theme layouts, components, and styles to compiled slides", async () => {
    const html = await renderCompiledDeckPageAsync({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "ThemeBadge",
                props: { tone: "accent" },
                children: [{ type: "text", value: "Trusted theme component" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
      theme: {
        name: "sample-theme",
        style: ".theme-cover{color:var(--theme-accent)}",
        components: {
          ThemeBadge: (props) =>
            jsx("strong", {
              class: `theme-badge theme-badge-${String(props.tone)}`,
              children: props.children,
            }),
        },
        layouts: {
          cover: ({ children, slide, deck }) =>
            jsx("div", {
              class: "theme-cover",
              "data-theme-layout": slide.meta.layout,
              "data-theme-deck": deck.slug,
              children,
            }),
        },
      },
      style: ".slide{--theme-accent:#8bd3ff}",
    });

    expect(html).toContain(".theme-cover{color:var(--theme-accent)}.slide{--theme-accent:#8bd3ff}");
    expect(html).toContain('class="slide layout-cover hero"');
    expect(html).toContain('class="theme-cover"');
    expect(html).toContain('data-theme-layout="cover"');
    expect(html).toContain('data-theme-deck="deck1"');
    expect(html).toContain('class="theme-badge theme-badge-accent"');
    expect(html).toContain("Trusted theme component");
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

  it("renders the built-in EmbedFrame component with safe iframe defaults and fallback content", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "EmbedFrame",
                props: {
                  src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  fallbackHref: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                  title: "Demo video",
                  aspectRatio: "16 / 9",
                  allow: "fullscreen; picture-in-picture",
                },
                children: [{ type: "text", value: "Open video" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-embed-frame"');
    expect(html).toContain('data-component="EmbedFrame"');
    expect(html).toContain('style="aspect-ratio:16 / 9"');
    expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="Demo video"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"');
    expect(html).toContain('allow="fullscreen; picture-in-picture"');
    expect(html).toContain("allowfullscreen");
    expect(html).toContain(
      '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noreferrer">Open video</a>',
    );
    expect(html).not.toContain("mdx-component");
  });

  it("renders the built-in SocialEmbed component as a script-free link fallback", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "SocialEmbed",
                props: {
                  href: "https://x.com/honojs/status/123",
                  provider: "x",
                  author: "@honojs",
                  label: "Open on X",
                },
                children: [{ type: "text", value: "Hono decks can keep SNS content link-first." }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-social-embed"');
    expect(html).toContain('data-component="SocialEmbed"');
    expect(html).toContain('data-provider="x"');
    expect(html).toContain('cite="https://x.com/honojs/status/123"');
    expect(html).toContain("Hono decks can keep SNS content link-first.");
    expect(html).toContain("@honojs");
    expect(html).toContain(
      '<a href="https://x.com/honojs/status/123" target="_blank" rel="noreferrer">Open on X</a>',
    );
    expect(html).not.toContain("platform.twitter.com/widgets.js");
    expect(html).not.toContain('data-component="TweetEmbed"');
    expect(html).not.toContain('<blockquote class="twitter-tweet"');
    expect(html).not.toContain("mdx-component");
  });

  it("renders the built-in TweetEmbed component with official embed markup", () => {
    const href = "https://x.com/honojs/status/1659577874821836801?s=20";
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "TweetEmbed",
                props: {
                  href,
                  label: "Open post on X",
                },
                children: [],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-tweet-embed"');
    expect(html).toContain('data-component="TweetEmbed"');
    expect(html).toContain('class="twitter-tweet"');
    expect(html).toContain('data-dnt="true"');
    expect(html).toContain(`<a href="${href}" target="_blank" rel="noreferrer">Open post on X</a>`);
    expect(html).toContain('src="https://platform.twitter.com/widgets.js"');
    expect(html).toContain("async");
    expect(html).not.toContain("mdx-component");
  });

  it("renders the built-in LinkCard component as a script-free link preview fallback", () => {
    const html = renderCompiledDeckPage({
      deck: {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            nodes: [
              {
                type: "component",
                name: "LinkCard",
                props: {
                  href: "https://hono.dev/docs/",
                  title: "Hono Docs",
                  description: "Read the Hono documentation.",
                  image: "https://hono.dev/og.png",
                  siteName: "Hono",
                },
                children: [{ type: "text", value: "Open Hono docs" }],
              },
            ],
          },
        ],
      },
      mountPath: "/slides",
    });

    expect(html).toContain('class="hono-decks-link-card"');
    expect(html).toContain('data-component="LinkCard"');
    expect(html).toContain('href="https://hono.dev/docs/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain("Hono Docs");
    expect(html).toContain("Read the Hono documentation.");
    expect(html).toContain('src="https://hono.dev/og.png"');
    expect(html).toContain('alt="Hono Docs"');
    expect(html).toContain("grid-template-columns:minmax(9rem,32%) minmax(0,1fr)");
    expect(html).toContain("aspect-ratio:16/9");
    expect(html).toContain("@media (max-width: 640px)");
    expect(html).toContain(".hono-decks-link-card-anchor{grid-template-columns:1fr}");
    expect(html).toContain('class="hono-decks-link-card-site"');
    expect(html).toContain("Hono");
    expect(html).toContain("Open Hono docs");
    expect(html).not.toContain("mdx-component");
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
