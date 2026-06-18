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
}

export function parseDeck(markdown: string): SlideDeck {
  const warnings: string[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const chunks = normalized.length > 0 ? normalized.split(slideSeparator) : [""];
  const slides = chunks
    .map((chunk, index) => parseSlide(chunk.trim(), index, warnings))
    .filter((slide) => slide.raw.length > 0 || slide.blocks.length > 0 || slide.nodes.length > 0);

  return { slides, warnings };
}

function parseSlide(source: string, index: number, warnings: string[]): Slide {
  const { attrs, body } = readSlideAttributes(source);
  const parsed = parseContent(body, warnings, index);
  const firstHeading = parsed.blocks.find((block) => block.type === "heading") as
    | Extract<SlideBlock, { type: "heading" }>
    | undefined;

  return {
    index,
    title: stringAttr(attrs.title) ?? firstHeading?.text,
    layout: stringAttr(attrs.layout) ?? (index === 0 ? "cover" : "default"),
    className: stringAttr(attrs.class),
    blocks: parsed.blocks,
    nodes: parsed.nodes,
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

function parseContent(body: string, warnings: string[], slideIndex: number): ParsedContent {
  addFenceWarnings(body, warnings, slideIndex);
  const root = parseMarkdownTree(body, warnings, slideIndex);
  const blocks: SlideBlock[] = [];
  const nodes: SlideNode[] = [];

  for (const child of root.children ?? []) {
    blocks.push(...toBlocks(child, warnings, slideIndex, body));
    nodes.push(...toNodes(child, warnings, slideIndex, body));
  }

  return { blocks, nodes };
}

function parseMarkdownTree(body: string, warnings: string[], slideIndex: number): MarkdownNode {
  try {
    return unified().use(remarkParse).use(remarkMdx).parse(body) as MarkdownNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MDX parse error";
    warnings.push(`Slide ${slideIndex + 1}: ${message}`);
    return unified().use(remarkParse).parse(body) as MarkdownNode;
  }
}

function addFenceWarnings(body: string, warnings: string[], slideIndex: number): void {
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
  if (openFence) warnings.push(`Slide ${slideIndex + 1}: code fence is not closed.`);
}

function toBlocks(node: MarkdownNode, warnings: string[], slideIndex: number, source: string): SlideBlock[] {
  switch (node.type) {
    case "heading":
      return [{ type: "heading", depth: headingDepth(node.depth), text: textContent(node) }];
    case "paragraph": {
      const image = soleImage(node);
      if (image) {
        return [
          {
            type: "image",
            alt: image.alt ?? "",
            src: image.url ?? "",
            ...(image.title ? { title: image.title } : {}),
          },
        ];
      }
      return [{ type: "paragraph", text: textContent(node).replace(/\s+/g, " ").trim() }];
    }
    case "list":
      return [
        {
          type: "list",
          ordered: node.ordered === true,
          items: (node.children ?? []).map((item) => textContent(item).replace(/\s+/g, " ").trim()).filter(Boolean),
        },
      ];
    case "code":
      return [{ type: "code", lang: node.lang ?? undefined, code: node.value ?? "" }];
    case "blockquote":
      return [{ type: "blockquote", text: textContent(node).trim() }];
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      return jsxElementBlock(node, warnings, slideIndex, source);
    case "mdxjsEsm":
      return [];
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return [];
    case "thematicBreak":
      return [];
    default:
      return textContent(node).trim() ? [{ type: "paragraph", text: textContent(node).trim() }] : [];
  }
}

function jsxElementBlock(
  node: MarkdownNode,
  warnings: string[],
  slideIndex: number,
  source: string,
): SlideBlock[] {
  const name = node.name ?? "";
  if (!name) return [];

  if (isComponentName(name)) {
    return [
      {
        type: "component",
        name,
        props: parseProps(node.attributes ?? [], warnings, slideIndex, name),
        raw: sourceForNode(node, source) ?? `<${name} />`,
      },
    ];
  }

  return [{ type: "paragraph", text: textContent(node).trim() }];
}

function toNodes(node: MarkdownNode, warnings: string[], slideIndex: number, source: string): SlideNode[] {
  switch (node.type) {
    case "text":
      return node.value ? [{ type: "text", value: node.value }] : [];
    case "emphasis":
      return [{ type: "element", tag: "em", props: {}, children: childrenToNodes(node, warnings, slideIndex, source) }];
    case "strong":
      return [
        { type: "element", tag: "strong", props: {}, children: childrenToNodes(node, warnings, slideIndex, source) },
      ];
    case "inlineCode":
      return [{ type: "element", tag: "code", props: {}, children: [{ type: "text", value: node.value ?? "" }] }];
    case "break":
      return [{ type: "element", tag: "br", props: {}, children: [] }];
    case "heading":
      return [
        {
          type: "element",
          tag: `h${headingDepth(node.depth)}`,
          props: {},
          children: childrenToNodes(node, warnings, slideIndex, source),
        },
      ];
    case "paragraph": {
      if (soleImage(node)) return childrenToNodes(node, warnings, slideIndex, source);
      if (isJsxOnlyParagraph(node)) return childrenToNodes(node, warnings, slideIndex, source);
      return [
        {
          type: "element",
          tag: "p",
          props: {},
          children: childrenToNodes(node, warnings, slideIndex, source),
        },
      ];
    }
    case "list": {
      const tag = node.ordered === true ? "ol" : "ul";
      return [
        {
          type: "element",
          tag,
          props: {},
          children: (node.children ?? []).map((child) => ({
            type: "element",
            tag: "li",
            props: {},
            children: childrenToNodes(child, warnings, slideIndex, source),
          })),
        },
      ];
    }
    case "listItem":
      return childrenToNodes(node, warnings, slideIndex, source);
    case "code":
      return [{ type: "code", lang: node.lang ?? undefined, value: node.value ?? "" }];
    case "blockquote":
      return [
        {
          type: "element",
          tag: "blockquote",
          props: {},
          children: childrenToNodes(node, warnings, slideIndex, source),
        },
      ];
    case "image":
      return [
        {
          type: "element",
          tag: "img",
          props: { src: node.url ?? "", alt: node.alt ?? "", ...(node.title ? { title: node.title } : {}) },
          children: [],
        },
      ];
    case "link":
      return [
        {
          type: "element",
          tag: "a",
          props: { href: node.url ?? "" },
          children: childrenToNodes(node, warnings, slideIndex, source),
        },
      ];
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      return jsxElementNodes(node, warnings, slideIndex, source);
    case "mdxjsEsm":
      warnings.push(`Slide ${slideIndex + 1}: MDX import/export syntax is ignored.`);
      return [];
    case "mdxFlowExpression":
    case "mdxTextExpression":
      warnings.push(`Slide ${slideIndex + 1}: MDX JavaScript expressions are ignored.`);
      return [];
    case "thematicBreak":
      return [{ type: "element", tag: "hr", props: {}, children: [] }];
    default:
      return childrenToNodes(node, warnings, slideIndex, source);
  }
}

function jsxElementNodes(
  node: MarkdownNode,
  warnings: string[],
  slideIndex: number,
  source: string,
): SlideNode[] {
  const name = node.name ?? "";
  if (!name) return childrenToNodes(node, warnings, slideIndex, source);
  if (isUnsafeHtmlElement(name)) return [{ type: "text", value: sourceForNode(node, source) ?? textContent(node) }];
  const props = parseProps(node.attributes ?? [], warnings, slideIndex, name);
  const children = childrenToNodes(node, warnings, slideIndex, source).filter(
    (child) => child.type !== "text" || child.value.trim() !== "",
  );

  if (isComponentName(name)) return [{ type: "component", name, props, children }];
  return [{ type: "element", tag: name, props, children }];
}

function childrenToNodes(
  node: MarkdownNode,
  warnings: string[],
  slideIndex: number,
  source: string,
): SlideNode[] {
  return (node.children ?? []).flatMap((child) => toNodes(child, warnings, slideIndex, source));
}

function parseProps(
  attributes: MdxAttribute[],
  warnings: string[],
  slideIndex: number,
  componentName: string,
): Record<string, SlidePropValue> {
  const props: Record<string, SlidePropValue> = {};

  for (const attr of attributes) {
    if (attr.type !== "mdxJsxAttribute" || !attr.name) continue;
    if (attr.value === null || attr.value === undefined) {
      props[attr.name] = true;
      continue;
    }
    if (typeof attr.value === "string" || typeof attr.value === "number" || typeof attr.value === "boolean") {
      props[attr.name] = attr.value;
      continue;
    }
    warnings.push(
      `Slide ${slideIndex + 1}: MDX JavaScript expression props are ignored on ${componentName}.${attr.name}.`,
    );
  }

  return props;
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
