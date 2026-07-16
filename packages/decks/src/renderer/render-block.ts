import type { SlideBlock, SlidePropValue, TableAlign } from "../shared/types";

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
    case "image":
      return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}"${
        block.title ? ` title="${escapeHtml(block.title)}"` : ""
      } />`;
    case "component":
      if (block.name === "Hero") return renderHero(block.props);
      return `<div class="mdx-component" data-component="${escapeHtml(block.name)}"><strong>&lt;${escapeHtml(
        block.name,
      )} /&gt;</strong>${renderProps(block.props)}</div>`;
    case "table":
      return renderTable(block.header, block.rows, block.align);
  }
}

function renderTable(header: string[], rows: string[][], align: TableAlign[]): string {
  const cellAttr = (index: number) => (align[index] ? ` style="text-align:${align[index]}"` : "");
  const headRow = `<tr>${header.map((cell, index) => `<th${cellAttr(index)}>${inline(cell)}</th>`).join("")}</tr>`;
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell, index) => `<td${cellAttr(index)}>${inline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead>${headRow}</thead><tbody>${bodyRows}</tbody></table>`;
}

function renderHero(props: Record<string, SlidePropValue>): string {
  const title = stringProp(props, "title");
  const subtitle = stringProp(props, "subtitle") ?? stringProp(props, "description");
  const eyebrow = stringProp(props, "eyebrow");
  const image = stringProp(props, "image") ?? stringProp(props, "src");
  const alt = stringProp(props, "alt") ?? title ?? "Hero image";
  const featured = props.featured === true ? " is-featured" : "";
  const hasImage = image ? " has-image" : "";

  return `<section class="mdx-hero${featured}${hasImage}" data-component="Hero">${
    image ? `<img class="mdx-hero-image" src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" />` : ""
  }<div class="mdx-hero-copy">${eyebrow ? `<p class="mdx-hero-eyebrow">${inline(eyebrow)}</p>` : ""}${
    title ? `<h1>${inline(title)}</h1>` : ""
  }${subtitle ? `<p class="mdx-hero-subtitle">${inline(subtitle)}</p>` : ""}</div></section>`;
}

function stringProp(props: Record<string, SlidePropValue>, key: string): string | undefined {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function renderProps(props: Record<string, SlidePropValue>): string {
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
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
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
