import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalDevSlidesApp } from "../src/node";

describe("local file-based dev sample app", () => {
  it("wires filesystem decks into dev router view/edit/save/event routes", async () => {
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

        const presentation = await app.request("/slides/local/render");
        expect(presentation.status).toBe(200);
        expect(await presentation.text()).toContain("/slides/local/edit/events");

        const edit = await app.request("/slides/local/edit");
        expect(edit.status).toBe(200);
        expect(await edit.text()).toContain("# Local Deck");

        const savedMarkdown = `---\ntitle: Saved Deck\n---\n\n# Saved Deck`;
        const save = await app.request("/slides/local/edit/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markdown: savedMarkdown }),
        });
        expect(save.status).toBe(200);
        await expect(readFile(join(cwd, "decks", "local", "deck.mdx"), "utf8")).resolves.toBe(savedMarkdown);

        const events = await app.request("/slides/local/edit/events?once=1");
        expect(events.status).toBe(200);
        expect(await events.text()).toContain("event: deck:updated");
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
