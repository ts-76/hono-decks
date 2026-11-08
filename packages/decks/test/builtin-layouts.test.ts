import { describe, expect, it } from "vite-plus/test";
import { readFrontmatter, splitOpeningFrontmatter, toSlideFrontmatter } from "../src/deck/frontmatter";
import type { CompileWarning } from "../src/deck/model";
import type { MarkdownNode } from "../src/generator/mdx/syntax";
import { remarkTwoColumns } from "../src/generator/mdx/syntax";
import { renderCompiledSlide, renderCompiledSlideAsync } from "../src/renderer/compiled-render";

describe("built-in layouts", () => {
  it("recognizes image keys on the opening slide", () => {
    const opening = splitOpeningFrontmatter(
      readFrontmatter("---\ntitle: Deck\nlayout: image-left\nimage: ./assets/a.png\nimage-alt: A picture\n---\nbody")
        .attrs,
    );
    const warnings: CompileWarning[] = [];
    const meta = toSlideFrontmatter(opening.firstSlide, warnings, { slideIndex: 0 });
    expect(meta).toMatchObject({ image: "./assets/a.png", imageAlt: "A picture", meta: {} });
    expect(opening.deck).toEqual({ title: "Deck" });
  });

  it("splits top-level markers while preserving nested and fenced content", () => {
    const text = (value: string) => ({ type: "paragraph", children: [{ type: "text", value }] });
    const code = { type: "code", value: "::right::\n---" };
    const nested = { type: "mdxJsxFlowElement", name: "Box", children: [text("::right::")] };
    const tree: MarkdownNode = { type: "root", children: [code, nested, text("::right::"), text("right")] };
    remarkTwoColumns()(tree);
    expect(tree.children).toHaveLength(2);
    expect(tree.children?.[0]?.children).toEqual([code, nested]);
    expect(tree.children?.[1]?.children).toEqual([text("right")]);
  });

  it("renders escaped image metadata with rewritten local assets in both renderers", async () => {
    const slide = {
      index: 0,
      meta: { layout: "image-left", image: "./assets/a.png", imageAlt: 'A "picture"', meta: {} },
      html: "<p>Body</p>",
      components: [],
    };
    const assets = [
      { sourcePath: "/deck/assets/a.png", publicPath: "/decks/demo/assets/a.png", type: "local" as const },
    ];
    const html = renderCompiledSlide(slide, assets);
    expect(html).toContain('<img src="/decks/demo/assets/a.png" alt="A &quot;picture&quot;">');
    expect(html).toContain('class="hono-decks-layout-body"');
    expect(await renderCompiledSlideAsync(slide, assets)).toBe(html);
  });
});
