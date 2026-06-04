import { CompileError } from "./deck";
import { parseDeck } from "./parser";
import { renderBlock } from "./render-block";
import type {
  CompileDeckInput,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  DeckFrontmatter,
  SlideFrontmatter,
} from "./deck";
import type { SlideBlock } from "./types";

export async function compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck> {
  const { attrs: deckAttrs, body } = readFrontmatter(input.markdown);
  assertSingleFileAssetRules(input, body);

  const slideSources = splitSlideSources(body);
  const slides: CompiledSlide[] = slideSources.map((source, index) => compileSlide(input.slug, source, index));

  return {
    slug: input.slug,
    sourcePath: input.sourcePath,
    kind: input.kind,
    meta: toDeckFrontmatter(deckAttrs),
    slides,
    assets: [],
    warnings: [],
  };
}

function compileSlide(slug: string, source: string, index: number): CompiledSlide {
  const { attrs, body } = readFrontmatter(source);
  const parsed = parseDeck(body);
  const blocks = parsed.slides[0]?.blocks ?? [];
  const components = collectComponents(slug, index, blocks);
  const firstParsedSlide = parsed.slides[0];
  const meta = toSlideFrontmatter(attrs, firstParsedSlide?.title, firstParsedSlide?.layout, firstParsedSlide?.className);

  return {
    index,
    meta,
    html: blocks.map(renderBlock).join("\n"),
    components,
    notes: meta.notes,
  };
}

function splitSlideSources(source: string): string[] {
  const lines = source.replace(/\r\n/g, "\n").trim().split("\n");
  const slides: string[] = [];
  let current: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    if (isFence(lines[cursor])) {
      if (isFrontmatterStart(lines, cursor)) {
        if (hasMeaningfulLines(current)) {
          slides.push(current.join("\n").trim());
        }
        current = [];
        const frontmatterEnd = findFrontmatterEnd(lines, cursor);
        current.push(...lines.slice(cursor, frontmatterEnd + 1));
        cursor = frontmatterEnd + 1;
        continue;
      }

      if (hasMeaningfulLines(current)) {
        slides.push(current.join("\n").trim());
        current = [];
      }
      cursor += 1;
      continue;
    }

    current.push(lines[cursor]);
    cursor += 1;
  }

  if (hasMeaningfulLines(current)) {
    slides.push(current.join("\n").trim());
  }

  return slides;
}

function collectComponents(slug: string, slideIndex: number, blocks: SlideBlock[]): ComponentPlaceholder[] {
  return blocks
    .filter((block): block is Extract<SlideBlock, { type: "component" }> => block.type === "component")
    .map((block, componentIndex) => ({
      id: `${slug}-${slideIndex}-${componentIndex}`,
      name: block.name,
      props: block.props,
      source: block.raw,
    }));
}

function readFrontmatter(source: string): { attrs: Record<string, unknown>; body: string } {
  const normalized = source.replace(/\r\n/g, "\n").trimStart();
  if (!normalized.startsWith("---\n")) return { attrs: {}, body: source.trim() };

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new CompileError("Frontmatter block is not closed.", "frontmatter-unclosed");

  const rawAttrs = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "").trim();
  return { attrs: parseFrontmatterAttrs(rawAttrs), body };
}

function parseFrontmatterAttrs(source: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const value = match[2];
    if (value === "|") {
      const block: string[] = [];
      i += 1;
      while (i < lines.length && /^\s+/.test(lines[i])) {
        block.push(lines[i].trim());
        i += 1;
      }
      i -= 1;
      attrs[key] = block.join("\n").trim();
      continue;
    }
    attrs[key] = parseScalar(value);
  }

  return attrs;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\[.*\]$/.test(trimmed)) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed;
}

function toDeckFrontmatter(attrs: Record<string, unknown>): DeckFrontmatter {
  const meta = { ...attrs };
  const deck: DeckFrontmatter = { meta };

  deck.title = takeString(meta, "title");
  deck.description = takeString(meta, "description");
  deck.author = takeString(meta, "author");
  deck.date = takeString(meta, "date");
  deck.theme = takeString(meta, "theme");
  deck.assets = takeString(meta, "assets");
  deck.draft = takeBoolean(meta, "draft");
  deck.presenter = takeBoolean(meta, "presenter");

  const tags = meta.tags;
  if (Array.isArray(tags)) {
    deck.tags = tags.map(String);
    delete meta.tags;
  }

  return deck;
}

function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  fallbackTitle?: string,
  fallbackLayout?: string,
  fallbackClassName?: string,
): SlideFrontmatter {
  const meta = { ...attrs };
  const slide: SlideFrontmatter = {
    title: takeString(meta, "title") ?? fallbackTitle,
    layout: takeString(meta, "layout") ?? fallbackLayout,
    className: takeString(meta, "class") ?? fallbackClassName,
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition: takeString(meta, "transition"),
    meta,
  };

  return slide;
}

function assertSingleFileAssetRules(input: CompileDeckInput, markdown: string): void {
  if (input.kind !== "single-file") return;
  if (/(?:src=|background:\s*)["']?\.\//.test(markdown) || /!\[[^\]]*\]\(\.\//.test(markdown)) {
    throw new CompileError(
      `Single-file deck ${input.sourcePath} cannot reference local relative assets.`,
      "single-file-local-asset",
    );
  }
}

function isFrontmatterStart(lines: string[], index: number): boolean {
  if (!isFence(lines[index])) return false;
  const next = lines[index + 1];
  return next != null && /^([A-Za-z_][A-Za-z0-9_-]*):\s*/.test(next) && findFrontmatterEnd(lines, index) > index;
}

function findFrontmatterEnd(lines: string[], start: number): number {
  for (let i = start + 1; i < lines.length; i += 1) {
    if (isFence(lines[i])) return i;
  }
  return -1;
}

function isFence(line: string): boolean {
  return /^---\s*$/.test(line);
}

function hasMeaningfulLines(lines: string[]): boolean {
  return lines.some((line) => line.trim() !== "");
}

function takeString(attrs: Record<string, unknown>, key: string): string | undefined {
  const value = attrs[key];
  if (typeof value !== "string") return undefined;
  delete attrs[key];
  return value;
}

function takeBoolean(attrs: Record<string, unknown>, key: string): boolean | undefined {
  const value = attrs[key];
  if (typeof value !== "boolean") return undefined;
  delete attrs[key];
  return value;
}
