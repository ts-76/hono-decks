import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

export const browserRunDecks = [
  { slug: "sample", pages: 1 },
  { slug: "media", pages: 2 },
  { slug: "motion", pages: 1 },
];
export const defaultMaxPdfBytes = 25 * 1024 * 1024;

export function parseBrowserRunOrigin(origin) {
  const base = new URL(origin);
  const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(base.hostname);
  if (base.username || base.password) throw new Error("Browser Run origin must not include credentials");
  if (base.protocol !== "https:" && !(base.protocol === "http:" && isLoopback)) {
    throw new Error("Browser Run origin must use HTTPS; HTTP is allowed only for loopback origins");
  }
  return base;
}

export function buildBrowserRunExportUrl(origin, slug) {
  const base = parseBrowserRunOrigin(origin);
  const prefix = base.pathname.replace(/\/+$/, "");
  base.pathname = `${prefix}/decks/${encodeURIComponent(slug)}/export.pdf`;
  base.search = "";
  base.hash = "";
  return base.toString();
}

export async function countPdfPages(bytes) {
  const content = Buffer.from(bytes);
  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Browser Run response is not a PDF");
  }

  const document = await PDFDocument.load(content);
  return document.getPageCount();
}

export function assertBrowserRunPdfHeaders(response, deck) {
  if (response.status !== 200) {
    throw new Error(`Browser Run PDF for ${deck.slug} returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error(`Browser Run PDF for ${deck.slug} returned content-type ${contentType || "<missing>"}`);
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  if (!/attachment;\s*filename="[^"]+\.pdf"/i.test(contentDisposition)) {
    throw new Error(`Browser Run PDF for ${deck.slug} is missing a PDF attachment filename`);
  }
}

export async function inspectBrowserRunPdfResponse(response, body, deck, maxBytes = defaultMaxPdfBytes) {
  assertBrowserRunPdfHeaders(response, deck);
  if (body.byteLength < 100) {
    throw new Error(`Browser Run PDF for ${deck.slug} is unexpectedly small: ${body.byteLength} bytes`);
  }
  if (body.byteLength > maxBytes) {
    throw new Error(`Browser Run PDF for ${deck.slug} exceeds the ${maxBytes} byte limit: ${body.byteLength} bytes`);
  }

  const pages = await countPdfPages(body);
  return { slug: deck.slug, pages, bytes: body.byteLength };
}

export async function assertBrowserRunPdfResponse(response, body, deck, maxBytes = defaultMaxPdfBytes) {
  const result = await inspectBrowserRunPdfResponse(response, body, deck, maxBytes);
  if (result.pages !== deck.pages) {
    throw new Error(`Browser Run PDF for ${deck.slug} has ${result.pages} pages; expected ${deck.pages}`);
  }

  return result;
}

async function readResponseBody(response, maxBytes, deck) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Browser Run PDF for ${deck.slug} exceeds the ${maxBytes} byte limit: ${contentLength} bytes`);
  }

  if (!response.body) {
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > maxBytes) {
      throw new Error(`Browser Run PDF for ${deck.slug} exceeds the ${maxBytes} byte limit: ${body.byteLength} bytes`);
    }
    return body;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Browser Run PDF for ${deck.slug} exceeds the ${maxBytes} byte limit: ${total} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function smokeBrowserRun({
  origin,
  token,
  fetchImpl = fetch,
  decks = browserRunDecks,
  artifactDir,
  timeoutMs = 90_000,
  maxBytes = defaultMaxPdfBytes,
}) {
  if (!origin) throw new Error("Set HONO_DECKS_BROWSER_RUN_ORIGIN to a deployed or remote Worker origin");
  if (!token) throw new Error("Set HONO_DECKS_BROWSER_RUN_TOKEN to the export bearer token");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Browser Run timeoutMs must be positive");
  if (!Number.isFinite(maxBytes) || maxBytes < 100) throw new Error("Browser Run maxBytes must be at least 100");
  parseBrowserRunOrigin(origin);
  if (artifactDir) await mkdir(artifactDir, { recursive: true });

  const results = [];
  for (const deck of decks) {
    const url = buildBrowserRunExportUrl(origin, deck.slug);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: "application/pdf",
          authorization: `Bearer ${token}`,
        },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Browser Run PDF request for ${deck.slug} failed: ${message}`, { cause: error });
    }
    assertBrowserRunPdfHeaders(response, deck);
    const body = await readResponseBody(response, maxBytes, deck);
    const result = await inspectBrowserRunPdfResponse(response, body, deck, maxBytes);
    if (artifactDir) await writeFile(path.join(artifactDir, `${deck.slug}.pdf`), body);
    if (result.pages !== deck.pages) {
      throw new Error(`Browser Run PDF for ${deck.slug} has ${result.pages} pages; expected ${deck.pages}`);
    }
    results.push({ url, ...result });
  }
  return results;
}

async function main() {
  const results = await smokeBrowserRun({
    origin: process.env.HONO_DECKS_BROWSER_RUN_ORIGIN,
    token: process.env.HONO_DECKS_BROWSER_RUN_TOKEN,
    artifactDir: process.env.HONO_DECKS_BROWSER_RUN_ARTIFACTS,
  });
  for (const result of results) {
    console.log(`${result.slug} Browser Run PDF: ok (${result.pages} pages, ${result.bytes} bytes)`);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
