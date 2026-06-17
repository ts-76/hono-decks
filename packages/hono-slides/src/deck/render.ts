import { renderBlock } from "./render-block";
import type { Slide, SlideDeck } from "../shared/types";

export function renderDeck(deck: SlideDeck): string {
  return deck.slides.map(renderSlide).join("\n");
}

export function renderSlide(slide: Slide): string {
  const classes = ["slide", `layout-${safeClass(slide.layout)}`, slide.className ? safeClass(slide.className) : ""]
    .filter(Boolean)
    .join(" ");
  return `<section class="${classes}" data-slide-index="${slide.index}">${slide.blocks
    .map(renderBlock)
    .join("\n")}</section>`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}
