import { CompileError, SLIDE_TRANSITIONS } from "./model";
import type { CompiledDeck, DeckFrontmatter, SlideFrontmatter, SlideTransition } from "./model";

export interface FrontmatterParseResult {
  attrs: Record<string, unknown>;
  body: string;
}

export function readFrontmatter(source: string): FrontmatterParseResult {
  const normalized = source.replace(/\r\n/g, "\n").trimStart();
  if (!normalized.startsWith("---\n")) return { attrs: {}, body: source.trim() };

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new CompileError("Frontmatter block is not closed.", "frontmatter-unclosed");

  const rawAttrs = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "").trim();
  return { attrs: parseFrontmatterAttrs(rawAttrs), body };
}

export function toDeckFrontmatter(attrs: Record<string, unknown>, warnings: CompiledDeck["warnings"]): DeckFrontmatter {
  const meta = { ...attrs };
  const deck: DeckFrontmatter = { meta };

  deck.title = takeString(meta, "title");
  deck.description = takeString(meta, "description");
  deck.author = takeString(meta, "author");
  deck.date = takeString(meta, "date");
  deck.theme = takeString(meta, "theme");
  deck.transition = takeKnownStringWithWarning(meta, "transition", SLIDE_TRANSITIONS, "none", warnings, "unknown-transition");
  deck.transitionDuration = takeTransitionDuration(meta, warnings);
  deck.transitionEasing = takeTransitionEasing(meta, warnings);
  deck.assets = takeStringOrStringArray(meta, "assets");
  deck.draft = takeBoolean(meta, "draft");
  deck.presenter = takeBoolean(meta, "presenter");

  const tags = meta.tags;
  if (Array.isArray(tags)) {
    deck.tags = tags.map(String);
    delete meta.tags;
  }

  return deck;
}

export function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  input: {
    slideIndex: number;
    fallbackTransition?: SlideTransition;
    fallbackTransitionDuration?: string;
    fallbackTransitionEasing?: string;
    fallbackTitle?: string;
    fallbackLayout?: string;
    fallbackClassName?: string;
  },
): SlideFrontmatter {
  const meta = { ...attrs };
  const slide: SlideFrontmatter = {
    title: takeString(meta, "title") ?? input.fallbackTitle,
    layout: takeString(meta, "layout") ?? input.fallbackLayout,
    className: takeString(meta, "class") ?? input.fallbackClassName,
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition:
      takeKnownStringWithWarning(
        meta,
        "transition",
        SLIDE_TRANSITIONS,
        "none",
        warnings,
        "unknown-transition",
        input.slideIndex,
      ) ?? input.fallbackTransition,
    transitionDuration: takeTransitionDuration(meta, warnings, input.slideIndex) ?? input.fallbackTransitionDuration,
    transitionEasing: takeTransitionEasing(meta, warnings, input.slideIndex) ?? input.fallbackTransitionEasing,
    meta,
  };

  return slide;
}

export function addUnknownFrontmatterWarnings(
  warnings: CompiledDeck["warnings"],
  meta: Record<string, unknown>,
  scope: "deck" | "slide",
  slideIndex?: number,
): void {
  for (const key of Object.keys(meta)) {
    warnings.push({
      code: "unknown-frontmatter-key",
      message: `Unknown ${scope} frontmatter key "${key}" is preserved in meta.`,
      ...(slideIndex !== undefined ? { slideIndex } : {}),
    });
  }
}

export function splitSlideSources(source: string): string[] {
  const lines = source.replace(/\r\n/g, "\n").trim().split("\n");
  const slides: string[] = [];
  let current: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    if (isFence(lines[cursor])) {
      if (looksLikeFrontmatterFence(lines, cursor) && findFrontmatterEnd(lines, cursor) === -1) {
        throw new CompileError("Frontmatter block is not closed.", "frontmatter-unclosed");
      }

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

function parseFrontmatterAttrs(source: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) {
      if (line.trim()) {
        throw new CompileError(`Invalid frontmatter line ${index + 1}: "${line.trim()}"`, "frontmatter-invalid-line");
      }
      continue;
    }

    const key = match[1];
    const value = match[2];
    if (value === "|") {
      const block: string[] = [];
      index += 1;
      while (index < lines.length && /^\s+/.test(lines[index])) {
        block.push(lines[index].trim());
        index += 1;
      }
      index -= 1;
      attrs[key] = block.join("\n").trim();
      continue;
    }
    if (value.trim() === "") {
      const nested: string[] = [];
      index += 1;
      while (index < lines.length && /^\s+/.test(lines[index])) {
        nested.push(lines[index]);
        index += 1;
      }
      index -= 1;
      attrs[key] = parseNestedFrontmatterValue(nested);
      continue;
    }
    attrs[key] = parseScalar(value);
  }

  return attrs;
}

function isFrontmatterStart(lines: string[], index: number): boolean {
  return looksLikeFrontmatterFence(lines, index) && findFrontmatterEnd(lines, index) > index;
}

function looksLikeFrontmatterFence(lines: string[], index: number): boolean {
  if (!isFence(lines[index])) return false;
  const next = lines[index + 1];
  return next != null && /^([A-Za-z_][A-Za-z0-9_-]*):\s*/.test(next);
}

function findFrontmatterEnd(lines: string[], start: number): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isFence(lines[index])) return index;
  }
  return -1;
}

function isFence(line: string): boolean {
  return /^---\s*$/.test(line);
}

function hasMeaningfulLines(lines: string[]): boolean {
  return lines.some((line) => line.trim() !== "");
}

function parseNestedFrontmatterValue(lines: string[]): unknown {
  const meaningful = lines.map((line) => line.trim()).filter(Boolean);
  if (meaningful.every((line) => line.startsWith("- "))) {
    return meaningful.map((line) => parseScalar(line.slice(2)));
  }

  const object: Record<string, unknown> = {};
  for (const line of meaningful) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) {
      throw new CompileError(`Invalid nested frontmatter line: "${line}"`, "frontmatter-invalid-line");
    }
    object[match[1]] = parseScalar(match[2]);
  }
  return object;
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

function takeString(attrs: Record<string, unknown>, key: string): string | undefined {
  const value = attrs[key];
  if (typeof value !== "string") return undefined;
  delete attrs[key];
  return value;
}

function takeKnownStringWithWarning<const T extends string>(
  attrs: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  warnings: CompiledDeck["warnings"],
  code: string,
  slideIndex?: number,
): T | undefined {
  const value = attrs[key];
  delete attrs[key];
  if (value === undefined) return undefined;
  if (typeof value === "string" && values.includes(value as T)) return value as T;
  warnings.push({
    code,
    message: `Unknown ${key} value "${String(value)}"; using ${fallback}.`,
    ...(slideIndex !== undefined ? { slideIndex } : {}),
  });
  return fallback;
}

function takeTransitionDuration(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  slideIndex?: number,
): string | undefined {
  const value = attrs.transitionDuration;
  delete attrs.transitionDuration;
  if (value === undefined) return undefined;
  if (typeof value === "string" && isValidTransitionDuration(value)) return value;
  warnings.push({
    code: "invalid-transition-duration",
    message: `Invalid transitionDuration value "${String(value)}"; ignoring it.`,
    ...(slideIndex !== undefined ? { slideIndex } : {}),
  });
  return undefined;
}

function takeTransitionEasing(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  slideIndex?: number,
): string | undefined {
  const value = attrs.transitionEasing;
  delete attrs.transitionEasing;
  if (value === undefined) return undefined;
  if (typeof value === "string" && isValidTransitionEasing(value)) return value;
  warnings.push({
    code: "invalid-transition-easing",
    message: `Invalid transitionEasing value "${String(value)}"; ignoring it.`,
    ...(slideIndex !== undefined ? { slideIndex } : {}),
  });
  return undefined;
}

function isValidTransitionDuration(value: string): boolean {
  return value
    .split(",")
    .map((item) => item.trim())
    .every((item) => /^(?:\d+|\d*\.\d+)(?:ms|s)$/.test(item));
}

function isValidTransitionEasing(value: string): boolean {
  const easing = value.trim();
  return (
    ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"].includes(easing) ||
    /^cubic-bezier\(\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*\)$/.test(
      easing,
    ) ||
    /^steps\(\s*\d+\s*(?:,\s*(?:jump-start|jump-end|jump-none|jump-both|start|end))?\s*\)$/.test(easing) ||
    /^linear\([^)]+\)$/.test(easing)
  );
}

function takeStringOrStringArray(attrs: Record<string, unknown>, key: string): string | string[] | undefined {
  const value = attrs[key];
  if (typeof value === "string") {
    delete attrs[key];
    return value;
  }
  if (Array.isArray(value)) {
    delete attrs[key];
    return value.map(String);
  }
  return undefined;
}

function takeBoolean(attrs: Record<string, unknown>, key: string): boolean | undefined {
  const value = attrs[key];
  if (typeof value !== "boolean") return undefined;
  delete attrs[key];
  return value;
}
