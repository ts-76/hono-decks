import type { LinkCardOgpMetadata } from "../generator/mdx-module-generator";

export async function resolveOgpMetadata(url: string): Promise<LinkCardOgpMetadata | undefined> {
  if (!isHttpUrl(url) || typeof fetch === "undefined") return undefined;

  try {
    const response = await fetch(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(1500),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) return undefined;

    return parseOgpHtml(await response.text(), url);
  } catch {
    return undefined;
  }
}

function parseOgpHtml(html: string, pageUrl: string): LinkCardOgpMetadata | undefined {
  const meta = collectHtmlMeta(html);
  const title = firstValue(meta, ["og:title", "twitter:title"]) ?? htmlTitle(html);
  const description = firstValue(meta, ["og:description", "twitter:description", "description"]);
  const image = absoluteUrl(firstValue(meta, ["og:image", "og:image:url", "twitter:image"]), pageUrl);
  const siteName = firstValue(meta, ["og:site_name", "application-name"]);
  const result = { title, description, image, siteName };

  return Object.values(result).some(Boolean) ? result : undefined;
}

function collectHtmlMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  const tagPattern = /<meta\b[^>]*>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const attributes = parseHtmlAttributes(match[0]);
    const key = attributes.property ?? attributes.name;
    const content = attributes.content;
    if (key && content && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), decodeHtmlEntities(content.trim()));
    }
  }
  return meta;
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function firstValue(meta: Map<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meta.get(key);
    if (value) return value;
  }
  return undefined;
}

function htmlTitle(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) : undefined;
}

function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
