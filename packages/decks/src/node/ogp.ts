import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { LinkCardOgpMetadata } from "../generator/mdx-module-generator";

const MAX_OGP_BYTES = 256 * 1024;
const MAX_OGP_REDIRECTS = 3;

export async function resolveOgpMetadata(url: string): Promise<LinkCardOgpMetadata | undefined> {
  if (!isHttpUrl(url) || typeof fetch === "undefined") return undefined;

  try {
    const response = await fetchPublicHttpUrl(url);
    if (!response) return undefined;

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html") || isTooLarge(response)) return undefined;

    const html = await readTextWithLimit(response, MAX_OGP_BYTES);
    if (!html) return undefined;
    return parseOgpHtml(html, response.url || url);
  } catch {
    return undefined;
  }
}

async function fetchPublicHttpUrl(url: string): Promise<Response | undefined> {
  let current = url;
  for (let redirect = 0; redirect <= MAX_OGP_REDIRECTS; redirect += 1) {
    if (!(await isPublicHttpUrl(current))) return undefined;

    const response = await fetch(current, {
      headers: { accept: "text/html,application/xhtml+xml" },
      redirect: "manual",
      signal: AbortSignal.timeout(1500),
    });

    if (!isRedirect(response.status)) return response;

    await response.body?.cancel();

    const location = response.headers.get("location");
    if (!location) return undefined;
    current = new URL(location, current).toString();
  }
  return undefined;
}

async function isPublicHttpUrl(value: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (isLocalHostname(url.hostname)) return false;
  if (isPrivateIpAddress(url.hostname)) return false;

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIpAddress(address));
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost" || normalized.endsWith(".localhost");
}

function isPrivateIpAddress(value: string): boolean {
  const normalized = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version === 6) return isPrivateIpv6(normalized);
  return false;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fec0:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const tail = normalized.slice("::ffff:".length);
    const dotted = tail.match(/^(?:0:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIpv4(dotted[1]);

    const hex = tail.match(/^(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = Number.parseInt(hex[1], 16);
      const lo = Number.parseInt(hex[2], 16);
      const value32 = (hi << 16) | lo;
      const ipv4 = [(value32 >>> 24) & 255, (value32 >>> 16) & 255, (value32 >>> 8) & 255, value32 & 255].join(".");
      return isPrivateIpv4(ipv4);
    }
  }

  return false;
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isTooLarge(response: Response): boolean {
  const contentLength = response.headers.get("content-length");
  return contentLength != null && Number(contentLength) > MAX_OGP_BYTES;
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string | undefined> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? undefined : text;
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
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
