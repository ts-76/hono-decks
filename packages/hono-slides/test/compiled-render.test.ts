import { describe, expect, it } from "vitest";
import { renderCompiledDeck, renderCompiledDeckPage } from "../src/renderer/compiled-render";
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
    expect(html).not.toContain('data-hono-slides-controls');
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
});
