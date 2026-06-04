import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { honoSlides } from "../src/middleware";

describe("honoSlides middleware", () => {
  it("serves a rendered slide deck from a mounted Hono route", async () => {
    const app = new Hono();
    app.use("/deck", honoSlides({ markdown: "# Hello\n\n---\n\n## Second" }));

    const response = await app.request("/deck");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("data-slide-index=\"1\"");
    expect(html).toContain("Hello");
  });

  it("can parse request JSON and expose deck variables to downstream handlers", async () => {
    const app = new Hono();
    app.use("/api/preview", honoSlides({ respond: false }));
    app.post("/api/preview", (c) => c.json({ count: c.var.slideDeck.slides.length, html: c.var.slideHtml }));

    const response = await app.request("/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# A\n\n---\n\n# B" }),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { count: number; html: string };
    expect(data.count).toBe(2);
    expect(data.html).toContain("data-slide-index=\"1\"");
  });
});
