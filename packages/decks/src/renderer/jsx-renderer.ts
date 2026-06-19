import { jsx } from "hono/jsx/jsx-runtime";
import { HtmlEscapedCallbackPhase, resolveCallback } from "hono/utils/html";
import type { Child } from "hono/jsx";
import type { HtmlEscapedString } from "hono/utils/html";
import type { SlideNode } from "../shared/types";

export type MaybePromise<T> = T | Promise<T>;
export type DeckRenderable = Child | HtmlEscapedString;
type ClientIslandPropValue =
  | string
  | number
  | boolean
  | null
  | ClientIslandPropValue[]
  | { [key: string]: ClientIslandPropValue };

export type SlideComponentProps = Record<string, unknown> & {
  children?: DeckRenderable;
};

export type SlideComponent = (props: SlideComponentProps) => DeckRenderable;

export interface SlideComponentDefinition {
  component: SlideComponent;
  client?: boolean;
  clientId?: string;
}

export type SlideComponentInput = SlideComponent | SlideComponentDefinition;
export type SlideComponentRegistry = Record<string, SlideComponentDefinition>;

export const builtInSlideComponents = defineSlideComponents({
  Fragment: (props) => {
    const order =
      typeof props.order === "number" || typeof props.order === "string" ? Number(props.order) : undefined;
    const fragmentOrder = order !== undefined && Number.isFinite(order) ? String(order) : undefined;
    const effect = stringProp(props.effect);

    return jsx("span", {
      "data-hono-decks-fragment": true,
      ...(fragmentOrder ? { "data-fragment-order": fragmentOrder } : {}),
      ...(effect ? { "data-fire-effect": safeToken(effect).toLowerCase() } : {}),
      children: props.children,
    });
  },
  Hero: (props) =>
    jsx("section", {
      class: `mdx-hero${props.featured === true ? " is-featured" : ""}${props.image || props.src ? " has-image" : ""}`,
      "data-component": "Hero",
      children: [
        heroImage(props),
        jsx("div", {
          class: "mdx-hero-copy",
          children: [
            typeof props.eyebrow === "string" && props.eyebrow
              ? jsx("p", { class: "mdx-hero-eyebrow", children: props.eyebrow })
              : "",
            typeof props.title === "string" && props.title ? jsx("h1", { children: props.title }) : "",
            typeof props.subtitle === "string" && props.subtitle
              ? jsx("p", { class: "mdx-hero-subtitle", children: props.subtitle })
              : typeof props.description === "string" && props.description
                ? jsx("p", { class: "mdx-hero-subtitle", children: props.description })
                : "",
          ],
        }),
      ],
    }),
  CodeBlock: (props) => {
    const lang = stringProp(props.lang);
    const filename = stringProp(props.filename ?? props.title);
    const highlight = stringProp(props.highlight);
    const code = codeBlockText(props.children);
    const highlightedHtml = typeof props.highlightedHtml === "string" ? props.highlightedHtml : undefined;

    return jsx("figure", {
      class: "hono-decks-code-block",
      ...(lang ? { "data-lang": lang } : {}),
      ...(filename ? { "data-filename": filename } : {}),
      ...(highlight ? { "data-highlight": highlight } : {}),
      children: [
        filename ? jsx("figcaption", { class: "hono-decks-code-caption", children: filename }) : "",
        highlightedHtml
          ? jsx("div", {
              class: "hono-decks-code-highlight",
              dangerouslySetInnerHTML: { __html: highlightedHtml },
            })
          : jsx("pre", {
              children: jsx("code", {
                ...(lang ? { class: `language-${safeToken(lang)}`, "data-lang": lang } : {}),
                children: code,
              }),
        }),
      ],
    });
  },
  EmbedFrame: (props) => {
    const src = stringProp(props.src);
    const title = stringProp(props.title) ?? "Embedded content";
    const aspectRatio = stringProp(props.aspectRatio) ?? "16 / 9";
    const loading = stringProp(props.loading) ?? "lazy";
    const allow = stringProp(props.allow) ?? "fullscreen; picture-in-picture";
    const sandbox =
      props.sandbox === false
        ? undefined
        : (stringProp(props.sandbox) ?? "allow-scripts allow-same-origin allow-presentation allow-popups");
    const referrerPolicy = stringProp(props.referrerPolicy ?? props.referrerpolicy) ?? "strict-origin-when-cross-origin";
    const fallbackHref = stringProp(props.fallbackHref ?? props.fallbackUrl ?? props.href) ?? src;
    const fallback = codeBlockText(props.children) || "Open embed";

    return jsx("figure", {
      class: "hono-decks-embed-frame",
      "data-component": "EmbedFrame",
      children: [
        jsx("div", {
          class: "hono-decks-embed-viewport",
          style: `aspect-ratio:${safeAspectRatio(aspectRatio)}`,
          children: src
            ? jsx("iframe", {
                src,
                title,
                loading,
                referrerpolicy: referrerPolicy,
                ...(sandbox ? { sandbox } : {}),
                ...(allow ? { allow } : {}),
                allowfullscreen: true,
              })
            : "",
        }),
        src
          ? jsx("figcaption", {
              class: "hono-decks-embed-fallback",
              children: jsx("a", { href: fallbackHref, target: "_blank", rel: "noreferrer", children: fallback }),
            })
          : "",
      ],
    });
  },
  SocialEmbed: (props) => {
    const href = stringProp(props.href ?? props.url);
    const provider = stringProp(props.provider ?? props.service);
    const author = stringProp(props.author);
    const label = stringProp(props.label) ?? (provider ? `Open on ${provider}` : "Open social post");
    const quote = codeBlockText(props.children);

    return jsx("figure", {
      class: "hono-decks-social-embed",
      "data-component": "SocialEmbed",
      ...(provider ? { "data-provider": safeToken(provider).toLowerCase() } : {}),
      children: jsx("blockquote", {
        class: "hono-decks-social-card",
        ...(href ? { cite: href } : {}),
        children: [
          quote ? jsx("p", { children: quote }) : "",
          jsx("footer", {
            children: [
              author ? jsx("span", { class: "hono-decks-social-author", children: author }) : "",
              href
                ? jsx("a", {
                    href,
                    target: "_blank",
                    rel: "noreferrer",
                    children: label,
                  })
                : "",
            ],
          }),
        ],
      }),
    });
  },
  TweetEmbed: (props) => {
    const href = stringProp(props.href ?? props.url);
    const label = stringProp(props.label) ?? "Open post on X";

    return jsx("figure", {
      class: "hono-decks-tweet-embed",
      "data-component": "TweetEmbed",
      children: [
        jsx("blockquote", {
          class: "twitter-tweet",
          "data-dnt": "true",
          children: href
            ? jsx("a", {
                href,
                target: "_blank",
                rel: "noreferrer",
                children: label,
              })
            : label,
        }),
        href
          ? jsx("script", {
              async: true,
              src: "https://platform.twitter.com/widgets.js",
              charset: "utf-8",
            })
          : "",
      ],
    });
  },
  LinkCard: (props) => {
    const href = stringProp(props.href ?? props.url);
    const title = stringProp(props.title) ?? href ?? "Link";
    const description = stringProp(props.description);
    const label = codeBlockText(props.children) || "Open link";

    return jsx("figure", {
      class: "hono-decks-link-card",
      "data-component": "LinkCard",
      children: href
        ? jsx("a", {
            class: "hono-decks-link-card-anchor",
            href,
            target: "_blank",
            rel: "noreferrer",
            children: [
              jsx("span", { class: "hono-decks-link-card-title", children: title }),
              description ? jsx("span", { class: "hono-decks-link-card-description", children: description }) : "",
              jsx("span", { class: "hono-decks-link-card-label", children: label }),
            ],
          })
        : [
            jsx("span", { class: "hono-decks-link-card-title", children: title }),
            description ? jsx("span", { class: "hono-decks-link-card-description", children: description }) : "",
          ],
    });
  },
});

export function defineSlideComponents(input: Record<string, SlideComponentInput>): SlideComponentRegistry {
  const registry: SlideComponentRegistry = {};
  for (const [name, value] of Object.entries(input)) {
    registry[name] = typeof value === "function" ? { component: value } : value;
  }
  return registry;
}

export function createMdxComponents(
  registry: SlideComponentRegistry,
  input: {
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  } = {},
): Record<string, (props: Record<string, unknown>) => DeckRenderable> {
  const components: Record<string, (props: Record<string, unknown>) => DeckRenderable> = {
    img: (props: Record<string, unknown>) => jsx("img", rewriteAssetProps(props, input.assets)),
    a: (props: Record<string, unknown>) => jsx("a", rewriteAssetProps(props, input.assets)),
  };

  for (const [name, definition] of Object.entries(registry)) {
    components[name] = (props: Record<string, unknown> = {}) =>
      renderRegisteredComponent(name, definition, props, props.children as DeckRenderable, input.assets);
  }

  return components;
}

function heroImage(props: SlideComponentProps): DeckRenderable {
  const image = typeof props.image === "string" ? props.image : typeof props.src === "string" ? props.src : undefined;
  if (!image) return "";
  const alt =
    typeof props.alt === "string" && props.alt ? props.alt : typeof props.title === "string" ? props.title : "Hero image";
  return jsx("img", { class: "mdx-hero-image", src: image, alt });
}

function stringProp(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function safeToken(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "text";
}

function safeAspectRatio(value: string): string {
  return /^\s*\d+(\.\d+)?\s*(\/|:)\s*\d+(\.\d+)?\s*$/.test(value)
    ? value.replace(":", " / ")
    : "16 / 9";
}

function codeBlockText(value: unknown): string {
  if (Array.isArray(value)) return value.map(codeBlockText).join("");
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (isJsxValue(value)) return codeBlockText((value as { props?: { children?: unknown } }).props?.children);
  return String(value);
}

export function renderSlideNodes(
  nodes: SlideNode[],
  input: {
    components?: SlideComponentRegistry;
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  } = {},
): string {
  return normalizeVoidElementSpacing(nodes.map((node) => String(renderSlideNode(node, input))).join(""));
}

export async function renderSlideNodesAsync(
  nodes: SlideNode[],
  input: {
    components?: SlideComponentRegistry;
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  } = {},
): Promise<string> {
  const rendered = await Promise.all(nodes.map((node) => renderJsxValue(renderSlideNode(node, input))));
  return normalizeVoidElementSpacing(rendered.join(""));
}

function renderSlideNode(
  node: SlideNode,
  input: {
    components?: SlideComponentRegistry;
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  },
): DeckRenderable {
  switch (node.type) {
    case "text":
      return String(node.value);
    case "code":
      return jsx("pre", {
        children: jsx("code", {
          ...(node.lang ? { "data-lang": node.lang } : {}),
          children: node.value,
        }),
      });
    case "element":
      return jsx(node.tag, {
        ...rewriteAssetProps(node.props, input.assets),
        children: node.children.map((child) => renderSlideNode(child, input)),
      });
    case "component":
      return renderComponentNode(node, input);
  }
}

function renderComponentNode(
  node: Extract<SlideNode, { type: "component" }>,
  input: {
    components?: SlideComponentRegistry;
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  },
): DeckRenderable {
  const definition = input.components?.[node.name];
  if (!definition) return renderComponentPlaceholder(node);

  const children = node.children.map((child) => renderSlideNode(child, input));
  return renderRegisteredComponent(node.name, definition, node.props, children, input.assets);
}

function renderRegisteredComponent(
  name: string,
  definition: SlideComponentDefinition,
  props: Record<string, unknown>,
  children: DeckRenderable,
  assets: Array<{ sourcePath: string; publicPath: string; type: string }> = [],
): DeckRenderable {
  const rewritten = rewriteAssetProps(props, assets);
  const componentProps = stripRuntimeProps(rewritten);
  const element = definition.component({ ...componentProps, children });
  if (!definition.client && rewritten.client !== true) return element;

  return jsx("div", {
    "data-hono-decks-island": definition.clientId ?? name,
    "data-hono-decks-props": JSON.stringify(serializableProps(name, componentProps)),
    children: element,
  });
}

export function renderJsxValueSync(value: DeckRenderable): string {
  const resolved = value;
  if (typeof resolved === "string") return resolved;
  if (resolved === null || resolved === undefined || typeof resolved === "boolean") return "";
  if (typeof resolved === "number") return String(resolved);
  const html = resolveCallback(resolved as never, HtmlEscapedCallbackPhase.Stringify, false, {});
  if (html instanceof Promise) {
    throw new Error("Async Hono JSX callbacks are not supported in sync rendering.");
  }
  return html;
}

export async function renderJsxValue(value: MaybePromise<DeckRenderable>): Promise<string> {
  const resolved = value instanceof Promise ? await value : value;
  if (typeof resolved === "string") return resolved;
  if (resolved === null || resolved === undefined || typeof resolved === "boolean") return "";
  if (typeof resolved === "number") return String(resolved);
  return await resolveCallback(resolved as never, HtmlEscapedCallbackPhase.Stringify, false, {});
}

function renderComponentPlaceholder(node: Extract<SlideNode, { type: "component" }>): DeckRenderable {
  return jsx("div", {
    class: "mdx-component",
    "data-component": node.name,
    children: [
      jsx("strong", { children: `<${node.name} />` }),
      Object.keys(node.props).length > 0
        ? jsx("dl", {
            children: Object.entries(node.props).map(([key, value]) =>
              jsx("div", {
                children: [jsx("dt", { children: key }), jsx("dd", { children: String(value) })],
              }),
            ),
          })
        : "",
    ],
  });
}

function stripRuntimeProps(props: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "client" || key === "client:island" || key === "children" || value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

function rewriteAssetProps(
  props: Record<string, unknown>,
  assets: Array<{ sourcePath: string; publicPath: string; type: string }> = [],
): Record<string, unknown> {
  const rewritten = { ...props };
  for (const key of ["src", "href", "image", "background"]) {
    const value = rewritten[key];
    if (typeof value !== "string") continue;
    const asset = findAssetForHtmlUrl(assets, value);
    if (asset) rewritten[key] = asset.publicPath;
  }
  return rewritten;
}

function serializableProps(componentName: string, props: Record<string, unknown>): Record<string, ClientIslandPropValue> {
  const result: Record<string, ClientIslandPropValue> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = serializeClientIslandProp(value, `${componentName}.${key}`);
  }
  return result;
}

function serializeClientIslandProp(value: unknown, path: string): ClientIslandPropValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Client island prop "${path}" must be JSON-serializable; non-finite numbers are not supported.`);
    }
    return value;
  }
  if (typeof value === "function") {
    throw new Error(`Client island prop "${path}" must be JSON-serializable; functions cannot be passed to the client.`);
  }
  if (value === undefined || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(`Client island prop "${path}" must be JSON-serializable; ${typeof value} values are not supported.`);
  }
  if (isJsxValue(value)) {
    throw new Error(`Client island prop "${path}" must be JSON-serializable; JSX values cannot be passed to the client.`);
  }
  if (value instanceof Date) {
    throw new Error(`Client island prop "${path}" must be JSON-serializable; Date values must be converted to strings.`);
  }
  if (Array.isArray(value)) return value.map((item, index) => serializeClientIslandProp(item, `${path}[${index}]`));
  if (!isPlainObject(value)) {
    throw new Error(`Client island prop "${path}" must be JSON-serializable; class instances are not supported.`);
  }

  const result: { [key: string]: ClientIslandPropValue } = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = serializeClientIslandProp(item, `${path}.${key}`);
  }
  return result;
}

function isJsxValue(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "tag" in value &&
    "props" in value &&
    "type" in value
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function findAssetForHtmlUrl(
  assets: Array<{ sourcePath: string; publicPath: string; type: string }>,
  value: string,
): { publicPath: string } | undefined {
  const normalized = decodeURIComponent(value).replace(/^\.?\//, "");
  return assets
    .filter((asset) => asset.type === "local")
    .find((asset) => {
      const assetPath = localAssetRelativePath(asset.sourcePath);
      return normalized === assetPath || normalized === `assets/${assetPath}`;
    });
}

function localAssetRelativePath(sourcePath: string): string {
  const marker = "/assets/";
  const normalized = sourcePath.replaceAll("\\", "/");
  const markerIndex = normalized.indexOf(marker);
  return markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
}

function normalizeVoidElementSpacing(html: string): string {
  return html.replace(/<(img|br|hr)([^>]*)\/>/g, "<$1$2 />");
}
