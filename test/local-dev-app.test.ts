import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalDevSlidesApp } from "../src/node/index";

describe("local file-based dev sample app", () => {
  it("wires filesystem decks into dev viewer routes without edit endpoints", async () => {
    const cwd = await createFixture();

    try {
      const { app, stop } = await createLocalDevSlidesApp({
        cwd,
        root: "decks",
        mountPath: "/slides",
        watchFileSystem: () => ({ close() {} }),
      });

      try {
        const index = await app.request("/slides");
        expect(index.status).toBe(200);
        expect(await index.text()).toContain("Local Deck");

        const view = await app.request("/slides/local");
        expect(view.status).toBe(200);
        const viewHtml = await view.text();
        expect(viewHtml).toContain("Local Deck");
        expect(viewHtml).toContain("/slides/local/render");

        const render = await app.request("/slides/local/render");
        expect(render.status).toBe(200);
        expect(await render.text()).not.toContain("/slides/local/edit/events");

        expect((await app.request("/slides/local/edit")).status).toBe(404);
        expect((await app.request("/slides/local/edit/save", { method: "POST" })).status).toBe(404);
        expect((await app.request("/slides/local/edit/events?once=1")).status).toBe(404);
      } finally {
        stop();
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

async function createFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-slides-local-dev-"));
  await mkdir(join(cwd, "decks", "local"), { recursive: true });
  await writeFile(
    join(cwd, "decks", "local", "deck.mdx"),
    `---\ntitle: Local Deck\n---\n\n# Local Deck`,
    "utf8",
  );
  return cwd;
}
