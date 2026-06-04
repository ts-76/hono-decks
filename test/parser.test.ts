import { describe, expect, it } from "vitest";
import { parseDeck } from "../src/parser";
import { renderDeck } from "../src/render";

describe("parseDeck", () => {
  it("parses slide attributes, markdown blocks, and MDX-like components", () => {
    const deck = parseDeck(`title: Intro
layout: cover

# Hello

<Hero title="World" featured />

---

## Agenda

- One
- Two

\`\`\`ts
const ok = true;
\`\`\``);

    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toMatchObject({ title: "Intro", layout: "cover" });
    expect(deck.slides[0].blocks).toContainEqual({
      type: "component",
      name: "Hero",
      props: { title: "World", featured: true },
      raw: '<Hero title="World" featured />',
    });
    expect(deck.slides[1].blocks.at(-1)).toMatchObject({ type: "code", lang: "ts" });
  });
});

describe("renderDeck", () => {
  it("escapes HTML while preserving inline markdown affordances", () => {
    const html = renderDeck(parseDeck("# <script>alert(1)</script>\n\nUse **bold** and `code`."));
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });
});
