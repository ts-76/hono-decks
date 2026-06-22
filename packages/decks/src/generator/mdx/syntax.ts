import { codeToHtml } from "shiki";
import type { SlideFrontmatter } from "../../deck/model";
import type { LinkCardOgpMetadata } from "./ogp";

export interface MarkdownNode {
  type: string;
  name?: string;
  value?: unknown;
  lang?: string;
  meta?: string;
  url?: string;
  title?: string | null;
  attributes?: MarkdownNode[] | Record<string, unknown>;
  children?: MarkdownNode[];
  data?: {
    hProperties?: Record<string, unknown>;
  };
}

export function remarkDeckSyntax(input: { linkCardMetadata?: Map<string, LinkCardOgpMetadata> } = {}) {
  return () => (tree: MarkdownNode) => {
    transformDeckSyntaxChildren(tree, input);
  };
}

export function remarkListFragments(fragments: SlideFrontmatter["fragments"]) {
  return () => (tree: MarkdownNode) => {
    if (fragments !== "list") return;
    markTopLevelListFragments(tree);
  };
}

export function remarkCodeHighlight() {
  return async (tree: MarkdownNode) => {
    await highlightMarkdownNode(tree);
  };
}

function transformDeckSyntaxChildren(
  node: MarkdownNode,
  input: { linkCardMetadata?: Map<string, LinkCardOgpMetadata> },
): void {
  if (!Array.isArray(node.children)) return;

  const children: MarkdownNode[] = [];
  for (const child of node.children) {
    transformDeckSyntaxChildren(child, input);
    children.push(
      zennEmbedNode(child, input) ??
      plainUrlLinkNode(child) ??
      fireDirectiveNode(child) ??
      firePropNode(child) ??
      unknownDirectiveFallback(child) ??
      child,
    );
  }
  node.children = children;
}

function zennEmbedNode(
  node: MarkdownNode,
  input: { linkCardMetadata?: Map<string, LinkCardOgpMetadata> },
): MarkdownNode | undefined {
  if (node.type !== "paragraph" || !Array.isArray(node.children) || node.children.length !== 2) return undefined;

  const [prefix, link] = node.children;
  if (prefix?.type !== "text" || String(prefix.value ?? "").trim() !== "@") return undefined;
  if (link?.type !== "link" || typeof link.url !== "string") return undefined;

  const name = collectMarkdownText(link).trim().toLowerCase();
  if (name === "youtube") {
    return mdxElement(
      "EmbedFrame",
      [
        mdxAttribute("provider", "youtube"),
        mdxAttribute("src", toYoutubeEmbedUrl(link.url)),
        mdxAttribute("fallbackHref", link.url),
        mdxAttribute("title", "YouTube embed example"),
      ],
      [{ type: "text", value: "Open YouTube embed" }],
    );
  }
  if (name === "x") {
    return mdxElement("TweetEmbed", [mdxAttribute("href", link.url), mdxAttribute("label", "Open post on X")], []);
  }
  if (name === "card") {
    const metadata = input.linkCardMetadata?.get(link.url);
    return mdxElement(
      "LinkCard",
      [
        mdxAttribute("href", link.url),
        ...metadataAttributes(metadata),
      ],
      [],
    );
  }
  if (name === "embed" || name === "iframe") {
    return mdxElement(
      "EmbedFrame",
      [mdxAttribute("src", link.url), mdxAttribute("title", "Embedded content")],
      [{ type: "text", value: "Open embed" }],
    );
  }
  return undefined;
}

function metadataAttributes(metadata: LinkCardOgpMetadata | undefined): MarkdownNode[] {
  if (!metadata) return [];
  return [
    ...(metadata.title ? [mdxAttribute("title", metadata.title)] : []),
    ...(metadata.description ? [mdxAttribute("description", metadata.description)] : []),
    ...(metadata.image ? [mdxAttribute("image", metadata.image)] : []),
    ...(metadata.siteName ? [mdxAttribute("siteName", metadata.siteName)] : []),
  ];
}

function plainUrlLinkNode(node: MarkdownNode): MarkdownNode | undefined {
  if (node.type !== "paragraph" || !Array.isArray(node.children) || node.children.length !== 1) return undefined;

  const [child] = node.children;
  if (child?.type !== "text" || typeof child.value !== "string") return undefined;

  const value = child.value.trim();
  if (!isHttpUrl(value)) return undefined;

  return {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: value,
        children: [{ type: "text", value }],
      },
    ],
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function fireDirectiveNode(node: MarkdownNode): MarkdownNode | undefined {
  if (node.type !== "containerDirective" || node.name !== "fire") return undefined;
  const attributes = directiveAttributes(node);
  const fragmentAttributes = [
    ...(typeof attributes.order === "string" ? [mdxAttribute("order", attributes.order)] : []),
    ...(typeof attributes.effect === "string" ? [mdxAttribute("effect", attributes.effect)] : []),
  ];
  return mdxElement("Fragment", fragmentAttributes, node.children ?? []);
}

function firePropNode(node: MarkdownNode): MarkdownNode | undefined {
  if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return undefined;
  if (!Array.isArray(node.attributes)) return undefined;

  const fireAttribute = node.attributes.find((attribute) => attribute.name === "$fire");
  if (!fireAttribute) return undefined;

  const effectAttribute = node.attributes.find((attribute) => attribute.name === "effect");
  node.attributes = node.attributes.filter((attribute) => attribute.name !== "$fire" && attribute.name !== "effect");

  const fragmentAttributes = [
    ...fireOrderAttribute(fireAttribute),
    ...(typeof effectAttribute?.value === "string" ? [mdxAttribute("effect", effectAttribute.value)] : []),
  ];
  return mdxElement("Fragment", fragmentAttributes, [node]);
}

function unknownDirectiveFallback(node: MarkdownNode): MarkdownNode | undefined {
  if (node.type === "textDirective") return { type: "text", value: `:${node.name ?? ""}` };
  if (node.type === "leafDirective") return { type: "text", value: `::${node.name ?? ""}` };
  if (node.type === "containerDirective") {
    return {
      type: "paragraph",
      children: [{ type: "text", value: `:::${node.name ?? ""}` }, ...(node.children ?? [])],
    };
  }
  return undefined;
}

function fireOrderAttribute(attribute: MarkdownNode): MarkdownNode[] {
  if (attribute.value === null || attribute.value === undefined || attribute.value === true) return [];
  if (typeof attribute.value === "string" && attribute.value.trim()) return [mdxAttribute("order", attribute.value.trim())];
  if (isMdxExpressionValue(attribute.value)) {
    const value = String(attribute.value.value ?? "").trim();
    if (/^\d+$/.test(value)) return [mdxAttribute("order", value)];
  }
  return [];
}

function isMdxExpressionValue(value: unknown): value is { value?: unknown } {
  return typeof value === "object" && value !== null && "value" in value;
}

function directiveAttributes(node: MarkdownNode): Record<string, string> {
  if (!node.attributes || Array.isArray(node.attributes)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attributes)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value);
    }
  }
  return result;
}

function mdxElement(name: string, attributes: MarkdownNode[], children: MarkdownNode[]): MarkdownNode {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children,
  };
}

function toYoutubeEmbedUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) return value;
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }
    return value;
  } catch {
    return value;
  }
}

function markTopLevelListFragments(root: MarkdownNode): void {
  let order = 1;

  function visit(node: MarkdownNode, listDepth: number): void {
    const nextListDepth = node.type === "list" ? listDepth + 1 : listDepth;
    if (!Array.isArray(node.children)) return;

    for (const child of node.children) {
      if (child.type === "listItem" && nextListDepth === 1) {
        child.data = {
          ...child.data,
          hProperties: {
            ...child.data?.hProperties,
            "data-hono-decks-fragment": "true",
            "data-fragment-order": String(order),
          },
        };
        order += 1;
      }
      visit(child, nextListDepth);
    }
  }

  visit(root, 0);
}

async function highlightMarkdownNode(node: MarkdownNode): Promise<void> {
  if (node.type === "code") {
    const code = typeof node.value === "string" ? node.value : "";
    const lang = typeof node.lang === "string" && node.lang ? node.lang : undefined;
    const highlightedHtml = await highlightCodeBlock(code, lang);

    node.type = "mdxJsxFlowElement";
    node.name = "CodeBlock";
    node.attributes = [
      ...(lang ? [mdxAttribute("lang", lang)] : []),
      mdxAttribute("highlightedHtml", highlightedHtml),
    ];
    node.children = [{ type: "text", value: code }];
    delete node.value;
    delete node.lang;
    delete node.meta;
    return;
  }

  if (node.type === "mdxJsxFlowElement" && node.name === "CodeBlock") {
    const code = collectMarkdownText(node);
    if (code.trim()) {
      const lang = getMdxStringAttribute(node, "lang");
      const highlightedHtml = await highlightCodeBlock(code, lang);
      node.attributes = upsertMdxStringAttribute(node.attributes, "highlightedHtml", highlightedHtml);
    }
    return;
  }

  if (!Array.isArray(node.children)) return;
  await Promise.all(node.children.map((child) => highlightMarkdownNode(child)));
}

async function highlightCodeBlock(code: string, lang: string | undefined): Promise<string> {
  const language = lang && /^[A-Za-z0-9_#+.-]+$/.test(lang) ? lang : "text";
  try {
    return await codeToHtml(code, { lang: language, theme: "github-dark" });
  } catch (error) {
    if (language === "text") throw error;
    return codeToHtml(code, { lang: "text", theme: "github-dark" });
  }
}

function mdxAttribute(name: string, value: string): MarkdownNode {
  return { type: "mdxJsxAttribute", name, value };
}

function getMdxStringAttribute(node: MarkdownNode, name: string): string | undefined {
  const attributes = Array.isArray(node.attributes) ? node.attributes : [];
  const attribute = attributes.find((item) => item.type === "mdxJsxAttribute" && item.name === name);
  return typeof attribute?.value === "string" ? attribute.value : undefined;
}

function upsertMdxStringAttribute(
  attributes: MarkdownNode["attributes"] | undefined,
  name: string,
  value: string,
): MarkdownNode[] {
  const next = Array.isArray(attributes) ? [...attributes] : [];
  const index = next.findIndex((item) => item.type === "mdxJsxAttribute" && item.name === name);
  const attribute = mdxAttribute(name, value);
  if (index === -1) return [...next, attribute];
  next[index] = attribute;
  return next;
}

function collectMarkdownText(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map((child) => collectMarkdownText(child)).join(node.type === "paragraph" ? "\n" : "");
}
