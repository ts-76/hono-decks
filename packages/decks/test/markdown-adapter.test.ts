import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect } from "vite-plus/test";
import { loadMarkdownAdapter } from "../src/node/markdown-adapter";
import { compileDecks } from "../src/node/compile-decks";

describe("host-independent Markdown adapter", () => {
  async function fixture(code: string, run: (cwd: string) => Promise<void>) {
    const cwd = await mkdtemp(join(tmpdir(), "deck-adapter-"));
    try {
      await mkdir(join(cwd, "node_modules/custom-markdown"), { recursive: true });
      await writeFile(join(cwd, "package.json"), '{"type":"module"}');
      await writeFile(
        join(cwd, "node_modules/custom-markdown/package.json"),
        '{"type":"module","exports":"./index.js"}',
      );
      await writeFile(join(cwd, "node_modules/custom-markdown/index.js"), code);
      await run(cwd);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
  it("resolves an app-owned compiler and options without Void and emits CLI files alongside MDX", async () => {
    await fixture(
      `export function createMarkdownAdapter({options}) { return {
      read(content) { return { frontmatter: {}, script: "", content }; },
      async compile() { return { code: "export default function Slide(){return '" + options.message + "'}", headings: [], clientCode: "" }; },
      client() { return ""; }
    }; }`,
      async (cwd) => {
        await mkdir(join(cwd, "decks"));
        await writeFile(join(cwd, "decks/plain.md"), "# Markdown");
        await writeFile(join(cwd, "decks/legacy.mdx"), "# Existing MDX");
        const output = await compileDecks({
          cwd,
          root: "decks",
          out: "generated",
          markdown: { adapter: "custom-markdown", options: { message: "Custom compiler" } },
        });
        expect(output.decks.map((deck) => deck.slug)).toEqual(["legacy", "plain"]);
        expect(await readFile(join(cwd, "generated/decks/plain/slide-0.ts"), "utf8")).toContain("Custom compiler");
        expect(await readFile(join(cwd, "generated/decks/legacy/slide-0.ts"), "utf8")).toContain("Existing MDX");
      },
    );
  });
  it("rejects an incomplete adapter before publishing files", async () => {
    await fixture("export const createMarkdownAdapter = () => ({read(){}});", async (cwd) => {
      await expect(loadMarkdownAdapter({ adapter: "custom-markdown" }, cwd)).rejects.toThrow(
        "read, compile and client",
      );
    });
  });
});
