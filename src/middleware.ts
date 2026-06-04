import type { Context, MiddlewareHandler } from "hono";
import { parseDeck } from "./parser";
import { renderDeck } from "./render";
import type { SlideDeck } from "./types";

declare module "hono" {
  interface ContextVariableMap {
    slideDeck: SlideDeck;
    slideHtml: string;
    slideMarkdown: string;
  }
}

type MaybePromise<T> = T | Promise<T>;

export interface HonoSlidesOptions {
  /** Static markdown, or a loader that can read from bindings/storage. */
  markdown?: string | ((c: Context) => MaybePromise<string>);
  /** When false, only parse/render and expose c.var.slideDeck / slideHtml, then call next(). */
  respond?: boolean;
  /** Page title used when respond=true. */
  title?: string;
  /** Extra CSS appended inside the generated deck page. */
  style?: string;
}

export function honoSlides(options: HonoSlidesOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    const markdown = await resolveMarkdown(c, options);
    const deck = parseDeck(markdown);
    const slideHtml = renderDeck(deck);

    c.set("slideMarkdown", markdown);
    c.set("slideDeck", deck);
    c.set("slideHtml", slideHtml);

    if (options.respond === false) {
      await next();
      return;
    }

    return c.html(renderDeckPage({
      title: options.title ?? deck.slides[0]?.title ?? "Hono Slides",
      slideHtml,
      warnings: deck.warnings,
      style: options.style,
    }));
  };
}

async function resolveMarkdown(c: Context, options: HonoSlidesOptions): Promise<string> {
  if (typeof options.markdown === "function") return options.markdown(c);
  if (typeof options.markdown === "string") return options.markdown;

  if (c.req.method !== "GET" && isJson(c.req.header("content-type"))) {
    const body = (await c.req.json().catch(() => ({}))) as { markdown?: unknown };
    return typeof body.markdown === "string" ? body.markdown : "";
  }

  return "";
}

export function renderDeckPage(input: {
  title: string;
  slideHtml: string;
  warnings?: string[];
  style?: string;
}): string {
  const warnings = input.warnings?.length
    ? `<aside class="hono-slides-warnings">${input.warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}</aside>`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>${baseDeckStyle()}${input.style ?? ""}</style>
</head>
<body>
  ${warnings}
  <main class="hono-slides-deck">${input.slideHtml}</main>
</body>
</html>`;
}

function isJson(contentType: string | undefined): boolean {
  return contentType?.toLowerCase().includes("application/json") ?? false;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function baseDeckStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#eef2ff}body{margin:0}.hono-slides-deck{display:grid;gap:1rem;padding:1rem}.slide{aspect-ratio:16/9;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:clamp(1.2rem,3vw,3rem);background:radial-gradient(circle at 15% 10%,rgba(139,211,255,.22),transparent 28%),linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));box-shadow:0 24px 80px rgba(0,0,0,.28);overflow:hidden}.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}.slide h1{font-size:clamp(2rem,6vw,5rem);line-height:.95}.slide h2{font-size:clamp(1.7rem,4vw,3.2rem)}.slide p,.slide li,.slide blockquote{font-size:clamp(1rem,2vw,1.5rem);line-height:1.55}.slide code{background:rgba(0,0,0,.35);border-radius:.35em;padding:.1em .35em}.slide pre{padding:1rem;border-radius:16px;background:rgba(0,0,0,.35);overflow:auto}.mdx-component{margin-top:1rem;border:1px dashed rgba(139,211,255,.55);border-radius:16px;padding:.85rem;color:#b8ffda;background:rgba(139,211,255,.08)}.mdx-component dl{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 0}.mdx-component div{display:flex;gap:.25rem;padding:.25rem .45rem;border-radius:999px;background:rgba(255,255,255,.08)}.mdx-component dt{color:#8bd3ff}.hono-slides-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}
