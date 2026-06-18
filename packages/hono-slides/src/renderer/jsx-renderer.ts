import { jsx } from "hono/jsx/jsx-runtime";
import type { SlideNode, SlidePropValue } from "../shared/types";

export type SlideComponentProps = Record<string, SlidePropValue | SlideNode[] | undefined> & {
  children?: unknown;
};

export type SlideComponent = (props: SlideComponentProps) => unknown;

export interface SlideComponentDefinition {
  component: SlideComponent;
  client?: boolean;
}

export type SlideComponentInput = SlideComponent | SlideComponentDefinition;
export type SlideComponentRegistry = Record<string, SlideComponentDefinition>;

export const builtInSlideComponents = defineSlideComponents({
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
});

export function defineSlideComponents(input: Record<string, SlideComponentInput>): SlideComponentRegistry {
  const registry: SlideComponentRegistry = {};
  for (const [name, value] of Object.entries(input)) {
    registry[name] = typeof value === "function" ? { component: value } : value;
  }
  return registry;
}

function heroImage(props: SlideComponentProps): unknown {
  const image = typeof props.image === "string" ? props.image : typeof props.src === "string" ? props.src : undefined;
  if (!image) return "";
  const alt =
    typeof props.alt === "string" && props.alt ? props.alt : typeof props.title === "string" ? props.title : "Hero image";
  return jsx("img", { class: "mdx-hero-image", src: image, alt });
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

function renderSlideNode(
  node: SlideNode,
  input: {
    components?: SlideComponentRegistry;
    assets?: Array<{ sourcePath: string; publicPath: string; type: string }>;
  },
): unknown {
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
): unknown {
  const definition = input.components?.[node.name];
  if (!definition) return renderComponentPlaceholder(node);

  const props = stripRuntimeProps(rewriteAssetProps(node.props, input.assets));
  const children = node.children.map((child) => renderSlideNode(child, input));
  const element = jsx(definition.component, { ...props, children });
  if (!definition.client && node.props.client !== true) return element;
  const rendered = String(element);

  return jsx("div", {
    "data-hono-slides-island": node.name,
    "data-hono-slides-props": JSON.stringify(props),
    dangerouslySetInnerHTML: { __html: rendered },
  });
}

function renderComponentPlaceholder(node: Extract<SlideNode, { type: "component" }>): unknown {
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

function stripRuntimeProps(props: Record<string, SlidePropValue | undefined>): Record<string, SlidePropValue> {
  const clean: Record<string, SlidePropValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "client" || key === "client:island" || value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

function rewriteAssetProps(
  props: Record<string, SlidePropValue | undefined>,
  assets: Array<{ sourcePath: string; publicPath: string; type: string }> = [],
): Record<string, SlidePropValue | undefined> {
  const rewritten = { ...props };
  for (const key of ["src", "href", "image", "background"]) {
    const value = rewritten[key];
    if (typeof value !== "string") continue;
    const asset = findAssetForHtmlUrl(assets, value);
    if (asset) rewritten[key] = asset.publicPath;
  }
  return rewritten;
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
