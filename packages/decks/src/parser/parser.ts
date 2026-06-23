import { unified } from "unified";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import type { Slide, SlideBlock, SlideDeck, SlideNode, SlidePropValue } from "../shared/types";

const slideSeparator = /^---\s*$/m;

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  depth?: number;
  ordered?: boolean | null;
  lang?: string | null;
  url?: string;
  alt?: string | null;
  title?: string | null;
  name?: string | null;
  attributes?: MdxAttribute[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type MdxAttribute = {
  type: string;
  name?: string;
  value?: string | number | boolean | null | { type: string; value?: string };
};

interface ParsedContent {
  blocks: SlideBlock[];
  nodes: SlideNode[];
  warnings: ParserWarning[];
}

export type ParserWarningCode =
  | "code-fence-unclosed"
  | "mdx-parse-error"
  | "mdx-import-export-ignored"
  | "mdx-expression-ignored"
  | "mdx-expression-prop-ignored";

export interface ParserWarning {
  code: ParserWarningCode;
  message: string;
  slideIndex: number;
}

interface ParsedDeckWithWarnings {
  slides: Slide[];
  warnings: ParserWarning[];
}

interface ParsedSlide {
  slide: Slide;
  warnings: ParserWarning[];
}

interface ParsedMarkdownTree {
  root: MarkdownNode;
  warnings: ParserWarning[];
}

interface ParsedBlockResult {
  blocks: SlideBlock[];
  warnings: ParserWarning[];
}

interface ParsedNodeResult {
  nodes: SlideNode[];
  warnings: ParserWarning[];
}

interface ParsedProps {
  props: Record<string, SlidePropValue>;
  warnings: ParserWarning[];
}

export function parseDeck(markdown: string): SlideDeck {
  const parsed = parseDeckWithWarnings(markdown);

  return {
    slides: parsed.slides,
    warnings: parsed.warnings.map((warning) => warning.message),
  };
}

export function parseDeckWithWarnings(markdown: string): ParsedDeckWithWarnings {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const chunks = normalized.length > 0 ? normalized.split(slideSeparator) : [""];
  const parsedSlides = chunks
    .map((chunk, index) => parseSlide(chunk.trim(), index))
    .filter(({ slide }) => slide.raw.length > 0 || slide.blocks.length > 0 || slide.nodes.length > 0);

  return {
    slides: parsedSlides.map(({ slide }) => slide),
    warnings: parsedSlides.flatMap(({ warnings }) => warnings),
  };
}

function parseSlide(source: string, index: number): ParsedSlide {
  const { attrs, body } = readSlideAttributes(source);
  const parsed = parseContent(body, index);
  const firstHeading = parsed.blocks.find((block) => block.type === "heading") as
    | Extract<SlideBlock, { type: "heading" }>
    | undefined;

  return {
    slide: {
      index,
      title: stringAttr(attrs.title) ?? firstHeading?.text,
      layout: stringAttr(attrs.layout) ?? (index === 0 ? "cover" : "default"),
      className: stringAttr(attrs.class),
      blocks: parsed.blocks,
      nodes: parsed.nodes,
      raw: source,
    },
    warnings: parsed.warnings,
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

function parseContent(body: string, slideIndex: number): ParsedContent {
  const { root, warnings: parseWarnings } = parseMarkdownTree(body, slideIndex);
  const blockResults = (root.children ?? []).map((child) => toBlocks(child, slideIndex, body));
  const nodeResults = (root.children ?? []).map((child) => toNodes(child, slideIndex, body));

  return {
    blocks: blockResults.flatMap(({ blocks }) => blocks),
    nodes: nodeResults.flatMap(({ nodes }) => nodes),
    warnings: [
      ...fenceWarningsFor(body, slideIndex),
      ...parseWarnings,
      ...blockResults.flatMap(({ warnings }) => warnings),
      ...nodeResults.flatMap(({ warnings }) => warnings),
    ],
  };
}

function parseMarkdownTree(body: string, slideIndex: number): ParsedMarkdownTree {
  try {
    return {
      root: unified().use(remarkParse).use(remarkMdx).parse(body) as MarkdownNode,
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MDX parse error";
    return {
      root: unified().use(remarkParse).parse(body) as MarkdownNode,
      warnings: [parserWarning("mdx-parse-error", `Slide ${slideIndex + 1}: ${message}`, slideIndex)],
    };
  }
}

function fenceWarningsFor(body: string, slideIndex: number): ParserWarning[] {
  let openFence: string | undefined;
  for (const line of body.split("\n")) {
    const match = /^(```|~~~)/.exec(line);
    if (!match) continue;
    if (!openFence) {
      openFence = match[1];
      continue;
    }
    if (line.startsWith(openFence)) openFence = undefined;
  }
  if (!openFence) return [];
  return [parserWarning("code-fence-unclosed", `Slide ${slideIndex + 1}: code fence is not closed.`, slideIndex)];
}

function toBlocks(node: MarkdownNode, slideIndex: number, source: string): ParsedBlockResult {
  switch (node.type) {
    case "heading":
      return blockResult([{ type: "heading", depth: headingDepth(node.depth), text: textContent(node) }]);
    case "paragraph": {
      const image = soleImage(node);
      if (image) {
        return blockResult([
          {
            type: "image",
            alt: image.alt ?? "",
            src: image.url ?? "",
            ...(image.title ? { title: image.title } : {}),
          },
        ]);
      }
      return blockResult([{ type: "paragraph", text: textContent(node).replace(/\s+/g, " ").trim() }]);
    }
    case "list":
      return blockResult([
        {
          type: "list",
          ordered: node.ordered === true,
          items: (node.children ?? []).map((item) => textContent(item).replace(/\s+/g, " ").trim()).filter(Boolean),
        },
      ]);
    case "code":
      return blockResult([{ type: "code", lang: node.lang ?? undefined, code: node.value ?? "" }]);
    case "blockquote":
      return blockResult([{ type: "blockquote", text: textContent(node).trim() }]);
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      return jsxElementBlock(node, slideIndex, source);
    case "mdxjsEsm":
    case "mdxFlowExpression":
    case "mdxTextExpression":
    case "thematicBreak":
      return blockResult([]);
    default:
      return blockResult(textContent(node).trim() ? [{ type: "paragraph", text: textContent(node).trim() }] : []);
  }
}

function jsxElementBlock(node: MarkdownNode, slideIndex: number, source: string): ParsedBlockResult {
  const name = node.name ?? "";
  if (!name) return blockResult([]);

  if (isComponentName(name)) {
    const parsedProps = parseProps(node.attributes ?? [], slideIndex, name);
    return blockResult(
      [
        {
          type: "component",
          name,
          props: parsedProps.props,
          raw: sourceForNode(node, source) ?? `<${name} />`,
        },
      ],
      parsedProps.warnings,
    );
  }

  return blockResult([{ type: "paragraph", text: textContent(node).trim() }]);
}

function toNodes(node: MarkdownNode, slideIndex: number, source: string): ParsedNodeResult {
  switch (node.type) {
    case "text":
      return nodeResult(node.value ? [{ type: "text", value: node.value }] : []);
    case "emphasis":
      return elementNodeResult(node, "em", slideIndex, source);
    case "strong":
      return elementNodeResult(node, "strong", slideIndex, source);
    case "inlineCode":
      return nodeResult([{ type: "element", tag: "code", props: {}, children: [{ type: "text", value: node.value ?? "" }] }]);
    case "break":
      return nodeResult([{ type: "element", tag: "br", props: {}, children: [] }]);
    case "heading":
      return elementNodeResult(node, `h${headingDepth(node.depth)}`, slideIndex, source);
    case "paragraph": {
      if (soleImage(node)) return childrenToNodes(node, slideIndex, source);
      if (isJsxOnlyParagraph(node)) return childrenToNodes(node, slideIndex, source);
      return elementNodeResult(node, "p", slideIndex, source);
    }
    case "list": {
      const tag = node.ordered === true ? "ol" : "ul";
      const childResults = (node.children ?? []).map((child) => childrenToNodes(child, slideIndex, source));
      return nodeResult(
        [
          {
            type: "element",
            tag,
            props: {},
            children: childResults.map(({ nodes }) => ({
              type: "element",
              tag: "li",
              props: {},
              children: nodes,
            })),
          },
        ],
        childResults.flatMap(({ warnings }) => warnings),
      );
    }
    case "listItem":
      return childrenToNodes(node, slideIndex, source);
    case "code":
      return nodeResult([{ type: "code", lang: node.lang ?? undefined, value: node.value ?? "" }]);
    case "blockquote":
      return elementNodeResult(node, "blockquote", slideIndex, source);
    case "image":
      return nodeResult([
        {
          type: "element",
          tag: "img",
          props: { src: node.url ?? "", alt: node.alt ?? "", ...(node.title ? { title: node.title } : {}) },
          children: [],
        },
      ]);
    case "link":
      return elementNodeResult(node, "a", slideIndex, source, { href: node.url ?? "" });
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      return jsxElementNodes(node, slideIndex, source);
    case "mdxjsEsm":
      return nodeResult(
        [],
        [
          parserWarning(
            "mdx-import-export-ignored",
            `Slide ${slideIndex + 1}: MDX import/export syntax is ignored.`,
            slideIndex,
          ),
        ],
      );
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return nodeResult(
        [],
        [
          parserWarning(
            "mdx-expression-ignored",
            `Slide ${slideIndex + 1}: MDX JavaScript expressions are ignored.`,
            slideIndex,
          ),
        ],
      );
    case "thematicBreak":
      return nodeResult([{ type: "element", tag: "hr", props: {}, children: [] }]);
    default:
      return childrenToNodes(node, slideIndex, source);
  }
}

function elementNodeResult(
  node: MarkdownNode,
  tag: string,
  slideIndex: number,
  source: string,
  props: Record<string, unknown> = {},
): ParsedNodeResult {
  const children = childrenToNodes(node, slideIndex, source);
  return nodeResult(
    [
      {
        type: "element",
        tag,
        props,
        children: children.nodes,
      },
    ],
    children.warnings,
  );
}

function jsxElementNodes(node: MarkdownNode, slideIndex: number, source: string): ParsedNodeResult {
  const name = node.name ?? "";
  if (!name) return childrenToNodes(node, slideIndex, source);
  if (isUnsafeHtmlElement(name)) {
    return nodeResult([{ type: "text", value: sourceForNode(node, source) ?? textContent(node) }]);
  }

  const parsedProps = parseProps(node.attributes ?? [], slideIndex, name);
  const parsedChildren = childrenToNodes(node, slideIndex, source);
  const children = parsedChildren.nodes.filter((child) => child.type !== "text" || child.value.trim() !== "");
  const warnings = [...parsedProps.warnings, ...parsedChildren.warnings];

  if (isComponentName(name)) return nodeResult([{ type: "component", name, props: parsedProps.props, children }], warnings);
  return nodeResult([{ type: "element", tag: name, props: parsedProps.props, children }], warnings);
}

function childrenToNodes(node: MarkdownNode, slideIndex: number, source: string): ParsedNodeResult {
  const results = (node.children ?? []).map((child) => toNodes(child, slideIndex, source));
  return nodeResult(
    results.flatMap(({ nodes }) => nodes),
    results.flatMap(({ warnings }) => warnings),
  );
}

function parseProps(attributes: MdxAttribute[], slideIndex: number, componentName: string): ParsedProps {
  const props: Record<string, SlidePropValue> = {};
  const warnings = attributes.flatMap((attr) => {
    if (attr.type !== "mdxJsxAttribute" || !attr.name) return [];
    if (attr.value === null || attr.value === undefined) {
      props[attr.name] = true;
      return [];
    }
    if (typeof attr.value === "string" || typeof attr.value === "number" || typeof attr.value === "boolean") {
      props[attr.name] = attr.value;
      return [];
    }
    return [
      parserWarning(
        "mdx-expression-prop-ignored",
        `Slide ${slideIndex + 1}: MDX JavaScript expression props are ignored on ${ignoredPropTarget(componentName, attr.name)}.`,
        slideIndex,
      ),
    ];
  });

  return { props, warnings };
}

function blockResult(blocks: SlideBlock[], emittedWarnings: ParserWarning[] = []): ParsedBlockResult {
  return { blocks, warnings: emittedWarnings };
}

function nodeResult(nodes: SlideNode[], emittedWarnings: ParserWarning[] = []): ParsedNodeResult {
  return { nodes, warnings: emittedWarnings };
}

function parserWarning(code: ParserWarningCode, message: string, slideIndex: number): ParserWarning {
  return { code, message, slideIndex };
}

function ignoredPropTarget(componentName: string, propName: string): string {
  if (propName.startsWith("$")) return `${componentName} dynamic prop`;
  return `${componentName}.${propName}`;
}

function textContent(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  if (node.type === "strong") return `**${(node.children ?? []).map(textContent).join("")}**`;
  if (node.type === "emphasis") return `*${(node.children ?? []).map(textContent).join("")}*`;
  if (node.type === "inlineCode") return `\`${node.value ?? ""}\``;
  if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name && !isComponentName(node.name)) {
    return `<${node.name}>${(node.children ?? []).map(textContent).join("")}</${node.name}>`;
  }
  return (node.children ?? []).map(textContent).join("");
}

function soleImage(node: MarkdownNode): MarkdownNode | undefined {
  const meaningful = (node.children ?? []).filter((child) => child.type !== "text" || child.value?.trim());
  return meaningful.length === 1 && meaningful[0].type === "image" ? meaningful[0] : undefined;
}

function isJsxOnlyParagraph(node: MarkdownNode): boolean {
  const children = node.children ?? [];
  return (
    children.length > 0 &&
    children.every(
      (child) =>
        child.type === "mdxJsxTextElement" ||
        child.type === "mdxJsxFlowElement" ||
        (child.type === "text" && child.value?.trim() === ""),
    )
  );
}

function sourceForNode(node: MarkdownNode, source: string): string | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number" ? source.slice(start, end) : undefined;
}

function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function isUnsafeHtmlElement(name: string): boolean {
  return /^(script|style|iframe|object|embed)$/i.test(name);
}

function headingDepth(value: number | undefined): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;
  return 3;
}

function stringAttr(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
