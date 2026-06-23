import type { CompiledDeck } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";
import { renderCompiledDeck, renderCompiledDeckAsync } from "./compiled-render";
import { renderClientEntryScript, renderLiveReloadScript, renderPresentationScript } from "./presentation-script";
import { basePresentationStyle } from "./presentation-style";

export function presentationPageTitle(deck: Pick<CompiledDeck, "slug" | "meta">): string {
  return deck.meta.title ?? deck.slug;
}

export function renderCompiledDeckPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
}): string {
  const { deck } = input;
  const warnings = renderWarnings(deck);
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs}>
  ${warnings}
  ${renderCompiledDeck(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

export async function renderCompiledDeckPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  printPreview?: boolean;
}): Promise<string> {
  const { deck } = input;
  const warnings = renderWarnings(deck);
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(presentationPageTitle(deck))}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs}>
  ${warnings}
  ${await renderCompiledDeckAsync(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

function renderWarnings(deck: CompiledDeck): string {
  return deck.warnings.length
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";
}

function mergeComponentInputs(
  base: Record<string, SlideComponentInput> | undefined,
  overrides: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): Record<string, SlideComponentInput> | SlideComponentRegistry | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  return { ...base, ...overrides };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
