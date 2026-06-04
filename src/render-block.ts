import type { SlideBlock } from "./types";

export function renderBlock(block: SlideBlock): string {
  switch (block.type) {
    case "heading":
      return `<h${block.depth}>${inline(block.text)}</h${block.depth}>`;
    case "paragraph":
      return `<p>${inline(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`;
    }
    case "code":
      return `<pre><code${block.lang ? ` data-lang="${escapeHtml(block.lang)}"` : ""}>${escapeHtml(
        block.code,
      )}</code></pre>`;
    case "blockquote":
      return `<blockquote>${inline(block.text)}</blockquote>`;
    case "component":
      return `<div class="mdx-component" data-component="${escapeHtml(block.name)}"><strong>&lt;${escapeHtml(
        block.name,
      )} /&gt;</strong>${renderProps(block.props)}</div>`;
  }
}

function renderProps(props: Record<string, string | boolean>): string {
  const entries = Object.entries(props);
  if (entries.length === 0) return "";
  return `<dl>${entries
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd></div>`)
    .join("")}</dl>`;
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
