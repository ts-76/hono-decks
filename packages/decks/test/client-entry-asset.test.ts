import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { serveDecksClientEntry } from "../src/server/client-entry";

describe("serveDecksClientEntry", () => {
  it("serves a generated client entry with JavaScript headers", async () => {
    const app = new Hono();
    app.get("/assets/decks.client.js", serveDecksClientEntry("console.log('deck');"));

    const response = await app.request("/assets/decks.client.js");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await response.text()).toBe("console.log('deck');");
  });
});
