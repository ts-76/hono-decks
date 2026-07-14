import { describe, expect, it } from "vitest";
import app from "../app/server";

describe("HonoX documentation site", () => {
  it("renders the Japanese home page with localized guide and API navigation", async () => {
    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("Slides belong in");
    expect(html).toContain("A route kit, not another runtime.");
    expect(html).toContain('href="/docs/getting-started?lang=ja"');
    expect(html).toContain('href="/api?lang=ja"');
    expect(html).toContain("app.route(&quot;/decks&quot;");
  });

  it("uses query, cookie, and Accept-Language detection with Japanese fallback", async () => {
    const query = await app.request("https://docs.example/docs/getting-started?lang=en");
    const queryHtml = await query.text();
    const cookie = await app.request("https://docs.example/docs/getting-started", { headers: { cookie: "language=en" } });
    const header = await app.request("https://docs.example/", { headers: { "accept-language": "en-US,en;q=0.9" } });
    const fallback = await app.request("https://docs.example/", { headers: { "accept-language": "fr-FR" } });

    expect(queryHtml).toContain('<html lang="en">');
    expect(queryHtml).toContain("Check the prerequisites");
    expect(queryHtml).toContain('href="/docs/getting-started?lang=ja"');
    expect(query.headers.get("set-cookie")).toContain("language=en");
    expect(await cookie.text()).toContain("Check the prerequisites");
    expect(await header.text()).toContain("Start in five minutes");
    expect(await fallback.text()).toContain('<html lang="ja">');
  });

  it.each([
    ["/docs/getting-started", "前提を確認する"],
    ["/docs/authoring", "deck は directory 単位"],
    ["/docs/routing", "既定 route surface"],
    ["/docs/security", "共通 document policy"],
    ["/api", "Runtime entry"],
  ])("renders %s from HonoX file routes", async (path, expected) => {
    const response = await app.request(path);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(expected);
    expect(html).toContain('class="docs-layout"');
    expect(html).toContain('class="mobile-page-nav"');
  });

  it("documents the complete first-run success and recovery path", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('id="prerequisites"');
    expect(html).toContain('id="install"');
    expect(html).toContain("src/generated/");
    expect(html).toContain("bun run dev");
    expect(html).toContain("http://localhost:3000/decks");
    expect(html).toContain('id="troubleshooting"');
    expect(html).toContain('href="/docs/authoring?lang=ja"');
  });

  it("renders anchored API definitions with imports, signatures, guide links, and source links", async () => {
    const html = await (await app.request("/api")).text();

    expect(html).toContain('id="define-decks"');
    expect(html).toContain('id="deck-document-options"');
    expect(html).toContain('id="compile-decks"');
    expect(html).toContain("import { defineDecks }");
    expect(html).toContain("defineDecks(options: DecksOptions): DefinedDecks");
    expect(html).toContain("packages/decks/src/server/define-decks.ts");
    expect(html).toContain('class="copy-button"');
    expect(html).not.toContain("<table>");
  });

  it("shows a safe Deploy to Cloudflare placeholder until the sample repository exists", async () => {
    const html = await (await app.request("/")).text();

    expect(html).toContain("https://deploy.workers.cloudflare.com/button");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("サンプル準備中");
    expect(html).not.toContain("deploy.workers.cloudflare.com/?url=");
  });

  it("loads the copy interaction client and exposes stateful mobile navigation labels", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('src="/app/client.ts"');
    expect(html).toContain('data-copy-status="true"');
    expect(html).toContain('class="menu-label-closed"');
    expect(html).toContain('class="menu-label-open"');
    expect(html).toContain('aria-current="page"');
  });

  it("redirects the documentation root with locale and returns 404 for unknown guides", async () => {
    const docs = await app.request("/docs?lang=en");
    const missing = await app.request("/docs/unknown");

    expect(docs.status).toBe(302);
    expect(docs.headers.get("location")).toBe("/docs/getting-started?lang=en");
    expect(missing.status).toBe(404);
  });
});
