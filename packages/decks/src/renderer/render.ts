import { renderBlock } from "./render-block";
import { builtInSlideComponents, renderSlideNodes } from "./jsx-renderer";
import type { Slide, SlideDeck } from "../shared/types";

export function renderDeck(deck: SlideDeck): string {
  return deck.slides.map(renderSlide).join("\n");
}

export function renderSlide(slide: Slide): string {
  const classes = ["slide", `layout-${safeClass(slide.layout)}`, slide.className ? safeClass(slide.className) : ""]
    .filter(Boolean)
    .join(" ");
  const html = slide.nodes.length > 0
    ? renderSlideNodes(slide.nodes, { components: builtInSlideComponents })
    : slide.blocks.map(renderBlock).join("\n");
  return `<section class="${classes}" data-slide-index="${slide.index}">${html}</section>`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}
