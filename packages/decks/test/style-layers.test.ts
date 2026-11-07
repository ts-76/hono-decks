import { describe, expect, it } from "vite-plus/test";
import { composeStylesheet, HONO_DECKS_LAYER_ORDER, layer, zeroSpecificity } from "../src/renderer/style-layers";

describe("zeroSpecificity", () => {
  it("wraps each selector in :where and keeps pseudo-elements outside", () => {
    expect(zeroSpecificity(".a .b,.c>d{color:red}")).toBe(":where(.a .b),:where(.c>d){color:red}");
    expect(zeroSpecificity("*,*::before,.x:after{margin:0}")).toBe(
      ":where(*),:where(*)::before,:where(.x):after{margin:0}",
    );
    expect(zeroSpecificity(':root{--x:1}[data-a="b,c"] i{x:y}')).toBe(
      ':where(:root){--x:1}:where([data-a="b,c"] i){x:y}',
    );
    expect(zeroSpecificity(".a:not(.b,.c):hover{x:y}")).toBe(":where(.a:not(.b,.c):hover){x:y}");
    expect(zeroSpecificity("::selection{x:y}")).toBe("::selection{x:y}");
  });

  it("recurses into grouping at-rules and leaves other at-rules alone", () => {
    expect(zeroSpecificity("@media (hover:hover){.a:hover{x:y}}@supports (a:b){.b{x:y}}")).toBe(
      "@media (hover:hover){:where(.a:hover){x:y}}@supports (a:b){:where(.b){x:y}}",
    );
    expect(zeroSpecificity("@keyframes k{from{opacity:0}to{opacity:1}}@page{size:A4}")).toBe(
      "@keyframes k{from{opacity:0}to{opacity:1}}@page{size:A4}",
    );
    expect(zeroSpecificity('.a{content:"}{"}.b{x:y}')).toBe(':where(.a){content:"}{"}:where(.b){x:y}');
  });
});

describe("layered stylesheets", () => {
  it("puts base and components at zero specificity but keeps runtime selectors", () => {
    expect(layer("base", ".slide{x:y}")).toBe("@layer hono-decks.base{:where(.slide){x:y}}");
    expect(layer("runtime", ".slide[hidden]{display:none}")).toBe(".slide[hidden]{display:none}");
    expect(layer("components", " ")).toBe("");
  });

  it("keeps the deck theme and app CSS unlayered after hono-decks CSS and hoists theme imports", () => {
    const css = composeStylesheet({
      layers: layer("base", ".slide{color:black}"),
      theme: '/* theme */\n@charset "utf-8";\n@import url("https://fonts.example/a.css");\n.slide{color:red}',
      app: ".slide{color:blue}",
    });
    expect(
      css.startsWith(`@charset "utf-8";${HONO_DECKS_LAYER_ORDER}@import url("https://fonts.example/a.css");`),
    ).toBe(true);
    expect(css).not.toContain("@layer hono-decks.theme");
    expect(css.indexOf("@layer hono-decks.base{")).toBeLessThan(css.indexOf(".slide{color:red}"));
    expect(css.indexOf(".slide{color:red}")).toBeLessThan(css.indexOf(".slide{color:blue}"));
    expect(css).not.toContain("/* theme */");
  });
});

describe("rendered page stylesheets", () => {
  it("layers defaults at zero specificity and keeps runtime, theme, and app CSS unlayered in order", async () => {
    const { renderCompiledDeckPage } = await import("../src/renderer/presentation-page");
    const html = renderCompiledDeckPage({
      deck: {
        slug: "d",
        sourcePath: "decks/d/deck.mdx",
        kind: "directory",
        meta: { meta: {} },
        slides: [{ index: 0, meta: { meta: {} }, html: "<p>x</p>" }],
        assets: [],
        warnings: [],
        themeStyle: ".theme-marker{color:red}",
      },
      mountPath: "/decks",
      style: ".app-marker{color:blue}",
    });
    const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
    const base = css.slice(css.indexOf("@layer hono-decks.base{"), css.indexOf("@layer hono-decks.components{"));

    expect(css).toContain(`>${HONO_DECKS_LAYER_ORDER}`);
    expect(base).toContain(":where(.slide){");
    expect(base).not.toMatch(/(^|[{}])\.slide[{ ]/);
    const runtime = css.indexOf("body:not([data-overview-mode]) .slide{position:absolute");
    expect(runtime).toBeGreaterThan(css.indexOf("@layer hono-decks.components{"));
    expect(css.indexOf(".theme-marker{color:red}")).toBeGreaterThan(runtime);
    expect(css.indexOf(".app-marker{color:blue}")).toBeGreaterThan(css.indexOf(".theme-marker{color:red}"));
    expect(css).not.toContain("@layer hono-decks.theme");
  });
});
