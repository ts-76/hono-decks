import { describe, expect, it } from "vite-plus/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  assertBrowserRunPdfResponse,
  buildBrowserRunExportUrl,
  countPdfPages,
  parseBrowserRunOrigin,
  smokeBrowserRun,
} from "../scripts/browser-run-smoke.mjs";

async function pdfBody(pages: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) document.addPage([595, 842]);
  return Buffer.from(await document.save());
}

async function pdfResponse(pages: number) {
  return new Response(await pdfBody(pages), {
    headers: {
      "content-disposition": 'attachment; filename="Hono-Slides.pdf"',
      "content-type": "application/pdf",
    },
  });
}

describe("Browser Run PDF smoke helpers", () => {
  it("builds an export URL while preserving a deployed path prefix", () => {
    expect(buildBrowserRunExportUrl("https://slides.example.test/demo/", "sample")).toBe(
      "https://slides.example.test/demo/decks/sample/export.pdf",
    );
  });

  it("requires HTTPS for remote origins but allows loopback HTTP", () => {
    expect(() => parseBrowserRunOrigin("http://slides.example.test")).toThrow("HTTPS");
    expect(parseBrowserRunOrigin("http://127.0.0.1:8787").hostname).toBe("127.0.0.1");
    expect(() => parseBrowserRunOrigin("https://user:pass@slides.example.test")).toThrow("credentials");
  });

  it("parses valid PDF page counts", async () => {
    expect(await countPdfPages(await pdfBody(2))).toBe(2);
  });

  it("requests every expected deck with the export bearer token and redirect protection", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const results = await smokeBrowserRun({
      origin: "https://slides.example.test",
      token: "sample-secret",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        const slug = String(url).split("/").at(-2);
        return pdfResponse(slug === "media" ? 2 : 1);
      },
    });

    expect(results.map((result) => result.slug)).toEqual(["sample", "media", "motion"]);
    expect(calls).toHaveLength(3);
    expect(calls[0]?.url).toBe("https://slides.example.test/decks/sample/export.pdf");
    expect(calls[0]?.init?.headers).toEqual({
      accept: "application/pdf",
      authorization: "Bearer sample-secret",
    });
    expect(calls[0]?.init?.redirect).toBe("error");
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a non-PDF or wrong-page response", async () => {
    await expect(
      assertBrowserRunPdfResponse(
        new Response("not a PDF", { status: 200, headers: { "content-type": "text/plain" } }),
        Buffer.from("not a PDF"),
        { slug: "sample", pages: 1 },
      ),
    ).rejects.toThrow("content-type");

    await expect(
      assertBrowserRunPdfResponse(await pdfResponse(2), await pdfBody(2), { slug: "sample", pages: 1 }),
    ).rejects.toThrow("has 2 pages; expected 1");
  });

  it("bounds responses and preserves a valid PDF before a page-count failure", async () => {
    const artifactDir = await mkdtemp(path.join(tmpdir(), "hono-decks-browser-run-test-"));
    try {
      await expect(
        smokeBrowserRun({
          origin: "https://slides.example.test",
          token: "sample-secret",
          decks: [{ slug: "sample", pages: 1 }],
          artifactDir,
          fetchImpl: async () => pdfResponse(2),
        }),
      ).rejects.toThrow("has 2 pages; expected 1");
      expect(await readFile(path.join(artifactDir, "sample.pdf"))).toHaveLength((await pdfBody(2)).length);

      await expect(
        smokeBrowserRun({
          origin: "https://slides.example.test",
          token: "sample-secret",
          decks: [{ slug: "sample", pages: 1 }],
          maxBytes: 100,
          fetchImpl: async () => pdfResponse(1),
        }),
      ).rejects.toThrow("byte limit");
    } finally {
      await rm(artifactDir, { recursive: true, force: true });
    }
  });
});
