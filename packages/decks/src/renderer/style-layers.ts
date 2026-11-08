/**
 * hono-decks splits its CSS by how freely applications may override it:
 *
 * - `@layer hono-decks.base`       tokens, page defaults, and slide typography
 * - `@layer hono-decks.components` built-in components and viewer/presenter chrome
 * - runtime (unlayered)            mechanics the runtime depends on: slide
 *                                  stacking, transitions, step reveals, fitting,
 *                                  and print layout
 *
 * Base and component selectors are wrapped in `:where()` and live in layers, so
 * any unlayered CSS overrides them regardless of specificity: the deck theme,
 * CSS emitted by deck components, the router `style` option, `viewer.style`,
 * and host page styles. Runtime rules stay unlayered with their specificity, so
 * a theme rule such as `.slide{position:relative}` cannot break slide stacking.
 */
export const HONO_DECKS_LAYER_ORDER = "@layer hono-decks.base,hono-decks.components;";

export type HonoDecksLayer = "base" | "components" | "runtime";

/** Wraps CSS in a hono-decks layer with zero-specificity selectors; runtime CSS stays unlayered. */
export function layer(name: HonoDecksLayer, css: string): string {
  const body = css.trim();
  if (!body) return "";
  return name === "runtime" ? body : `@layer hono-decks.${name}{${zeroSpecificity(body)}}`;
}

/**
 * Assembles one stylesheet: the layer order, hono-decks CSS, the deck theme, and
 * application CSS, in that order. `@import`/`@charset` statements at the start of
 * the theme are hoisted to the top, where browsers honor them.
 */
export function composeStylesheet(input: { layers: string; theme?: string; app?: string }): string {
  const { statements, rest } = hoistStatements(input.theme ?? "");
  const theme = rest.trim();
  return `${statements.charset}${HONO_DECKS_LAYER_ORDER}${statements.imports}\n${input.layers}${theme ? `\n${theme}` : ""}${input.app ? `\n${input.app}` : ""}`;
}

function hoistStatements(css: string): { statements: { charset: string; imports: string }; rest: string } {
  let charset = "";
  let imports = "";
  let rest = css;
  for (;;) {
    rest = rest.replace(/^(?:\s|\/\*[\s\S]*?\*\/)+/, "");
    const match = /^@(charset|import)\b(?:[^;"']|"[^"]*"|'[^']*')*;/i.exec(rest);
    if (!match) break;
    if (match[1]!.toLowerCase() === "charset") charset ||= match[0];
    else imports += match[0];
    rest = rest.slice(match[0].length);
  }
  return { statements: { charset, imports }, rest };
}

const GROUPING_AT_RULES = new Set(["media", "supports", "container", "layer", "scope", "document", "starting-style"]);

/**
 * Rewrites every style rule selector to `:where(selector)`, keeping pseudo-elements
 * outside (`:where(.a)::before`). Recurses into grouping at-rules and leaves
 * `@keyframes`, `@font-face`, `@page`, and declaration blocks untouched.
 */
export function zeroSpecificity(css: string): string {
  let output = "";
  let index = 0;
  while (index < css.length) {
    const preludeEnd = findPreludeEnd(css, index);
    if (preludeEnd === -1) {
      output += css.slice(index);
      break;
    }
    const prelude = css.slice(index, preludeEnd);
    if (css[preludeEnd] === ";") {
      output += css.slice(index, preludeEnd + 1);
      index = preludeEnd + 1;
      continue;
    }
    const blockEnd = findBlockEnd(css, preludeEnd);
    const block = css.slice(preludeEnd + 1, blockEnd);
    const trimmed = prelude.trim();
    if (trimmed.startsWith("@")) {
      const name = /^@([\w-]+)/.exec(trimmed)?.[1]?.toLowerCase() ?? "";
      output += GROUPING_AT_RULES.has(name) ? `${prelude}{${zeroSpecificity(block)}}` : `${prelude}{${block}}`;
    } else {
      const leading = /^\s*/.exec(prelude)![0];
      output += `${leading}${wrapSelectorList(trimmed)}{${block}}`;
    }
    index = blockEnd + 1;
  }
  return output;
}

function wrapSelectorList(list: string): string {
  return splitTopLevel(list, ",")
    .map((selector) => wrapSelector(selector.trim()))
    .join(",");
}

function wrapSelector(selector: string): string {
  if (!selector || selector.startsWith(":where(")) return selector;
  const pseudoElement = findPseudoElement(selector);
  const head = pseudoElement === -1 ? selector : selector.slice(0, pseudoElement);
  const tail = pseudoElement === -1 ? "" : selector.slice(pseudoElement);
  return head.trim() ? `:where(${head.trim()})${tail}` : selector;
}

/** Index of the first top-level `::name` or legacy `:before`/`:after`, or -1. */
function findPseudoElement(selector: string): number {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < selector.length; i += 1) {
    const char = selector[i]!;
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (depth === 0 && char === ":") {
      if (selector[i + 1] === ":") return i;
      if (/^:(?:before|after|first-line|first-letter)\b/i.test(selector.slice(i))) return i;
    }
  }
  return -1;
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]!;
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (depth === 0 && char === separator) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

/** Position of the `{` or `;` ending the prelude that starts at `start`, or -1. */
function findPreludeEnd(css: string, start: number): number {
  let depth = 0;
  let quote = "";
  for (let i = start; i < css.length; i += 1) {
    const char = css[i]!;
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (depth === 0 && (char === "{" || char === ";")) return i;
  }
  return -1;
}

/** Position of the `}` matching the `{` at `open`. */
function findBlockEnd(css: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < css.length; i += 1) {
    const char = css[i]!;
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return css.length - 1;
}
