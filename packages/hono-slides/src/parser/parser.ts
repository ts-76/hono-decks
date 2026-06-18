import type { Slide, SlideBlock, SlideDeck } from "../shared/types";

const slideSeparator = /^---\s*$/m;

export function parseDeck(markdown: string): SlideDeck {
  const warnings: string[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const chunks = normalized.length > 0 ? normalized.split(slideSeparator) : [""];
  const slides = chunks
    .map((chunk, index) => parseSlide(chunk.trim(), index, warnings))
    .filter((slide) => slide.raw.length > 0 || slide.blocks.length > 0);

  return { slides, warnings };
}

function parseSlide(source: string, index: number, warnings: string[]): Slide {
  const { attrs, body } = readSlideAttributes(source);
  const blocks = parseBlocks(body, warnings, index);
  const firstHeading = blocks.find((block) => block.type === "heading") as
    | Extract<SlideBlock, { type: "heading" }>
    | undefined;

  return {
    index,
    title: stringAttr(attrs.title) ?? firstHeading?.text,
    layout: stringAttr(attrs.layout) ?? (index === 0 ? "cover" : "default"),
    className: stringAttr(attrs.class),
    blocks,
    raw: source,
  };
}

function readSlideAttributes(source: string): {
  attrs: Record<string, string>;
  body: string;
} {
  const lines = source.split("\n");
  const attrs: Record<string, string> = {};
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const match = /^(title|layout|class):\s*(.+)$/.exec(line);
    if (!match) break;
    attrs[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    cursor += 1;
  }

  return { attrs, body: lines.slice(cursor).join("\n").trim() };
}

function parseBlocks(body: string, warnings: string[], slideIndex: number): SlideBlock[] {
  const lines = body.split("\n");
  const blocks: SlideBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const fence = /^```(\w+)?\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i === lines.length) warnings.push(`Slide ${slideIndex + 1}: code fence is not closed.`);
      else i += 1;
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        depth: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\((\S+)(?:\s+["']([^"']+)["'])?\)\s*$/.exec(line.trim());
    if (image) {
      blocks.push({
        type: "image",
        alt: image[1],
        src: image[2],
        ...(image[3] ? { title: image[3] } : {}),
      });
      i += 1;
      continue;
    }

    const component = /^<([A-Z][A-Za-z0-9_]*)([^>]*)\/>\s*$/.exec(line.trim());
    if (component) {
      blocks.push({
        type: "component",
        name: component[1],
        props: parseProps(component[2]),
        raw: line.trim(),
      });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", text: quote.join("\n") });
      continue;
    }

    if (/^\s*(?:[-*+] |\d+\. )/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\. /.test(line);
      while (i < lines.length && /^\s*(?:[-*+] |\d+\. )/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*(?:[-*+] |\d+\. )/, "").trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^!\[[^\]]*\]\(\S+(?:\s+["'][^"']+["'])?\)\s*$/.test(lines[i].trim()) &&
      !/^```/.test(lines[i]) &&
      !/^\s*(?:[-*+] |\d+\. )/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^<([A-Z][A-Za-z0-9_]*)([^>]*)\/>\s*$/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function parseProps(raw: string): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {};
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)(?:=("([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    props[match[1]] = match[3] ?? match[4] ?? match[5] ?? true;
  }
  return props;
}

function stringAttr(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
