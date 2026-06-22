import { compile } from "@mdx-js/mdx";
import remarkDirective from "remark-directive";
import { codeToHtml } from "shiki";
import { CompileError } from "../deck/model";
import type { AssetRef, CompiledDeck, DeckFrontmatter, DeckKind, SlideFrontmatter } from "../deck/model";
import type { ResolvedDeckFile } from "../routing/file-routing";

export interface CompileMdxModuleDecksInput {
  root: string;
  outDir: string;
  mountPath?: string;
  decks: ResolvedDeckFile[];
  componentModulePaths?: Record<string, string>;
  clientComponentIds?: Record<string, Record<string, string>>;
  themeStyles?: Record<string, DeckThemeStyleEntry>;
  resolveOgp?(url: string): Promise<LinkCardOgpMetadata | undefined>;
  readText(path: string): Promise<string>;
  readBinary?(path: string): Promise<Uint8Array>;
}

export interface DeckThemeStyleEntry {
  sourcePath: string;
  style: string;
}

export interface LinkCardOgpMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface GeneratedModuleDeck {
  deck: CompiledDeck;
  slideModules: GeneratedSlideModule[];
  componentModulePath?: string;
  clientComponentIds?: Record<string, string>;
}

export interface GeneratedSlideModule {
  path: string;
  importPath: string;
  code: string;
}

export interface GeneratedMdxModuleDecks {
  decks: GeneratedModuleDeck[];
  routerModule: string;
}

interface MarkdownNode {
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

export async function compileMdxModuleDecks(input: CompileMdxModuleDecksInput): Promise<GeneratedMdxModuleDecks> {
  const decks = await Promise.all(input.decks.map((entry) => compileMdxModuleDeck(input, entry)));
  return {
    decks,
    routerModule: emitModuleDecksRouter({ decks }),
  };
}

async function compileMdxModuleDeck(
  input: CompileMdxModuleDecksInput,
  entry: ResolvedDeckFile,
): Promise<GeneratedModuleDeck> {
  const source = await input.readText(entry.sourcePath);
  const { attrs, body } = readFrontmatter(source);
  const { prelude, body: contentBody } = extractDeckPrelude(body);
  const slideSources = splitSlideSources(contentBody);
  const assets = await buildAssetRefs(entry.slug, entry.assetPaths, input);
  const componentModulePath = componentImportPath(input.outDir, input.componentModulePaths?.[entry.slug]);
  const themeStyle = entry.kind === "directory" ? input.themeStyles?.[entry.slug] : undefined;
  const slideModules: GeneratedSlideModule[] = [];
  const slides: CompiledDeck["slides"] = [];
  const warnings: CompiledDeck["warnings"] = [];

  for (let index = 0; index < slideSources.length; index += 1) {
    const { attrs: slideAttrs, body: slideBody } = readFrontmatter(slideSources[index]);
    const slideModulePath = `${input.outDir}/decks/${entry.slug}/slide-${index}.ts`;
    const slideMeta = toSlideFrontmatter(slideAttrs, warnings, index);
    const moduleSource = [prelude, rewriteAssetUrls(slideBody, assets)].filter(Boolean).join("\n\n");
    const rewrittenSource = rewriteRelativeMdxImports(moduleSource, dirname(entry.sourcePath), dirname(slideModulePath));
    const code = await compileMdxModule(rewrittenSource, entry.sourcePath, index, slideMeta.fragments, input.resolveOgp);

    slideModules.push({
      path: slideModulePath,
      importPath: `./decks/${entry.slug}/slide-${index}`,
      code,
    });
    slides.push({
      index,
      meta: slideMeta,
      html: "",
      components: [],
      notes: slideMeta.notes,
    });
  }

  return {
    componentModulePath,
    clientComponentIds: input.clientComponentIds?.[entry.slug],
    deck: {
      slug: entry.slug,
      sourcePath: entry.sourcePath,
      kind: entry.kind,
      meta: toDeckFrontmatter(attrs),
      themeStyle: themeStyle?.style,
      themeSourcePath: themeStyle?.sourcePath,
      slides,
      assets,
      warnings,
    },
    slideModules,
  };
}

async function compileMdxModule(
  source: string,
  sourcePath: string,
  slideIndex: number,
  fragments: SlideFrontmatter["fragments"],
  resolveOgp: CompileMdxModuleDecksInput["resolveOgp"],
): Promise<string> {
  try {
    const linkCardMetadata = await resolveLinkCardMetadataByUrl(source, resolveOgp);
    const compiled = String(
      await compile(
        { path: `${sourcePath}#slide-${slideIndex + 1}`, value: source },
        {
          jsxRuntime: "automatic",
          jsxImportSource: "hono/jsx",
          format: "mdx",
          elementAttributeNameCase: "html",
          remarkPlugins: [
            remarkDirective,
            remarkDeckSyntax({ linkCardMetadata }),
            remarkListFragments(fragments),
            remarkCodeHighlight,
          ],
        },
      ),
    );
    return `// @ts-nocheck\n${compiled}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CompileError(
      `MDX compile failed in ${sourcePath} slide ${slideIndex + 1}: ${message}`,
      "mdx-compile-error",
    );
  }
}

function remarkDeckSyntax(input: { linkCardMetadata?: Map<string, LinkCardOgpMetadata> } = {}) {
  return () => (tree: MarkdownNode) => {
    transformDeckSyntaxChildren(tree, input);
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

async function resolveLinkCardMetadataByUrl(
  source: string,
  resolveOgp: CompileMdxModuleDecksInput["resolveOgp"],
): Promise<Map<string, LinkCardOgpMetadata>> {
  const result = new Map<string, LinkCardOgpMetadata>();
  if (!resolveOgp) return result;

  for (const url of collectLinkCardUrls(source)) {
    try {
      const metadata = await resolveOgp(url);
      if (metadata) result.set(url, metadata);
    } catch {
      // OGP fetch is best-effort; keep the link card fallback when metadata cannot be resolved.
    }
  }
  return result;
}

function collectLinkCardUrls(source: string): string[] {
  const urls = new Set<string>();
  const pattern = /@\[card\]\(([^)\s]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    urls.add(match[1]);
  }
  return [...urls];
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

function remarkListFragments(fragments: SlideFrontmatter["fragments"]) {
  return () => (tree: MarkdownNode) => {
    if (fragments !== "list") return;
    markTopLevelListFragments(tree);
  };
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

function remarkCodeHighlight() {
  return async (tree: MarkdownNode) => {
    await highlightMarkdownNode(tree);
  };
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

function emitModuleDecksRouter(input: { decks: GeneratedModuleDeck[] }): string {
  const slideImports = input.decks
    .flatMap((deck) =>
      deck.slideModules.map(
        (slide, index) => `import ${slideImportName(deck.deck.slug, index)} from ${JSON.stringify(slide.importPath)};`,
      ),
    )
    .join("\n");
  const componentImports = input.decks
    .filter((deck) => deck.componentModulePath)
    .map((deck) => `import * as ${componentImportName(deck.deck.slug)} from ${JSON.stringify(deck.componentModulePath)};`)
    .join("\n");

  return `// @ts-nocheck
import { defineDecks } from "@hono/decks";
import type { DecksRouterOverrides } from "@hono/decks";
import { decksClientEntry } from "./client-entry";
${slideImports}
${componentImports}

function withClientComponentIds(module, clientIds) {
  const registry = {};
  for (const [name, value] of Object.entries(module)) {
    const clientId = clientIds[name];
    if (typeof value === "function") {
      registry[name] = clientId ? { component: value, clientId } : value;
      continue;
    }
    if (value && typeof value === "object" && "component" in value) {
      registry[name] = clientId ? { ...value, clientId } : value;
    }
  }
  return registry;
}

export const decks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
${input.decks.map(emitDeckObject).join(",\n")}
  ]
});

export function decksRouter(options: DecksRouterOverrides = {}) {
  return decks.router(options);
}
`;
}

function emitDeckObject(deck: GeneratedModuleDeck): string {
  return `    {
      slug: ${JSON.stringify(deck.deck.slug)},
      sourcePath: ${JSON.stringify(deck.deck.sourcePath)},
      kind: ${JSON.stringify(deck.deck.kind)},
      meta: ${serializeValue(deck.deck.meta, 3)},
${deck.deck.themeStyle ? `      "themeStyle": ${serializeValue(deck.deck.themeStyle, 3)},\n` : ""}${deck.deck.themeSourcePath ? `      "themeSourcePath": ${JSON.stringify(deck.deck.themeSourcePath)},\n` : ""}
      assets: ${serializeValue(deck.deck.assets, 3)},
      componentRegistry: ${
        deck.componentModulePath
          ? `withClientComponentIds(${componentImportName(deck.deck.slug)}, ${serializeValue(deck.clientComponentIds ?? {}, 3)})`
          : "{}"
      },
      warnings: ${serializeValue(deck.deck.warnings, 3)},
      slides: [
${deck.deck.slides
  .map(
    (slide) => `        {
          index: ${slide.index},
          meta: ${serializeValue(slide.meta, 5)},
          html: "",
          components: [],
          notes: ${serializeValue(slide.notes, 5)},
          render: ${slideImportName(deck.deck.slug, slide.index)}
        }`,
  )
  .join(",\n")}
      ]
    }`;
}

function readFrontmatter(source: string): { attrs: Record<string, unknown>; body: string } {
  const normalized = source.replace(/\r\n/g, "\n").trimStart();
  if (!normalized.startsWith("---\n")) return { attrs: {}, body: source.trim() };

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new Error("Frontmatter block is not closed.");

  const rawAttrs = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "").trim();
  return { attrs: parseFrontmatterAttrs(rawAttrs), body };
}

function parseFrontmatterAttrs(source: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    attrs[match[1]] = parseScalar(match[2]);
  }

  return attrs;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function extractDeckPrelude(source: string): { prelude: string; body: string } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const prelude: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim() === "") {
      prelude.push(line);
      cursor += 1;
      continue;
    }
    if (/^\s*(import|export)\s/.test(line)) {
      prelude.push(line);
      cursor += 1;
      continue;
    }
    break;
  }

  return {
    prelude: prelude.join("\n").trim(),
    body: lines.slice(cursor).join("\n").trim(),
  };
}

function splitSlideSources(source: string): string[] {
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

async function buildAssetRefs(
  slug: string,
  assetPaths: string[],
  input: CompileMdxModuleDecksInput,
): Promise<AssetRef[]> {
  return Promise.all(
    assetPaths.map(async (sourcePath) => ({
      sourcePath,
      publicPath: `${normalizeMountPath(input.mountPath ?? `/${input.root}`)}/${encodeURIComponent(slug)}/assets/${assetName(
        sourcePath,
        input.root,
        slug,
      )}`,
      type: "local" as const,
      contentType: contentTypeForPath(sourcePath),
      body: input.readBinary ? ((await input.readBinary(sourcePath)) as BodyInit) : undefined,
    })),
  );
}

function rewriteAssetUrls(source: string, assets: AssetRef[]): string {
  let result = source;
  for (const asset of assets) {
    const assetPath = localAssetRelativePath(asset.sourcePath);
    result = result.replaceAll(`./assets/${assetPath}`, asset.publicPath);
    result = result.replace(new RegExp(`(?<!/)assets/${escapeRegExp(assetPath)}`, "g"), asset.publicPath);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteRelativeMdxImports(source: string, sourceDir: string, generatedDir: string): string {
  return source.replace(/(from\s+|import\s+)(["'])(\.[^"']+)\2/g, (_match, prefix: string, quote: string, specifier: string) => {
    const target = normalizePath(`${sourceDir}/${specifier}`);
    return `${prefix}${quote}${toRelativeImportPath(generatedDir, target)}${quote}`;
  });
}

function componentImportPath(outDir: string, sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  const source = sourcePath.replace(/\/index\.(tsx|ts|jsx|js)$/, "");
  return toRelativeImportPath(outDir, source);
}

function slideImportName(slug: string, index: number): string {
  return `Slide_${safeIdentifier(slug)}_${index}`;
}

function componentImportName(slug: string): string {
  return `Components_${safeIdentifier(slug)}`;
}

function safeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_") || "_";
}

function toDeckFrontmatter(attrs: Record<string, unknown>): DeckFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    description: takeString(meta, "description"),
    author: takeString(meta, "author"),
    theme: takeString(meta, "theme"),
    draft: takeBoolean(meta, "draft"),
    meta,
  };
}

function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  slideIndex: number,
): SlideFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    layout: takeString(meta, "layout"),
    className: takeString(meta, "class"),
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition: takeKnownFrontmatter(meta, "transition", ["none", "fade", "slide", "zoom"], "none", warnings, slideIndex, "unknown-transition"),
    fragments: takeKnownFrontmatter(meta, "fragments", ["none", "manual", "list"], "none", warnings, slideIndex, "unknown-fragments"),
    meta,
  };
}

function takeString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  delete source[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function takeBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  delete source[key];
  return typeof value === "boolean" ? value : undefined;
}

function takeKnownFrontmatter<const T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  warnings: CompiledDeck["warnings"],
  slideIndex: number,
  code: string,
): T | undefined {
  const value = source[key];
  delete source[key];
  if (value === undefined) return undefined;
  if (typeof value === "string" && values.includes(value as T)) return value as T;
  warnings.push({
    code,
    message: `Unknown ${key} value "${String(value)}"; using ${fallback}.`,
    slideIndex,
  });
  return fallback;
}

function serializeValue(value: unknown, depth: number): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (value === undefined) return "undefined";
  if (value instanceof Uint8Array) return `new Uint8Array([${[...value].join(", ")}])`;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextIndent}${serializeValue(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${serializeValue(item, depth + 1)}`)
      .join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function assetName(sourcePath: string, root: string, slug: string): string {
  const normalizedPath = normalizePath(sourcePath);
  const prefix = `${normalizePath(root).replace(/\/$/, "")}/${slug}/assets/`;
  const relative = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : (normalizedPath.split("/").at(-1) ?? normalizedPath);
  return relative.split("/").map(encodeURIComponent).join("/");
}

function localAssetRelativePath(sourcePath: string): string {
  const marker = "/assets/";
  const normalized = normalizePath(sourcePath);
  const markerIndex = normalized.indexOf(marker);
  return markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "." : normalized.slice(0, index);
}

function toRelativeImportPath(fromDir: string, target: string): string {
  const fromParts = normalizePath(fromDir).split("/").filter(Boolean);
  const targetParts = normalizePath(target).split("/").filter(Boolean);
  while (fromParts.length > 0 && targetParts.length > 0 && fromParts[0] === targetParts[0]) {
    fromParts.shift();
    targetParts.shift();
  }
  const relative = [...fromParts.map(() => ".."), ...targetParts].join("/");
  return relative.startsWith(".") ? relative : `./${relative || "."}`;
}

function contentTypeForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}
