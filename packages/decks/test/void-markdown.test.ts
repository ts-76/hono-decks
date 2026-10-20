import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { splitMarkdownSlides, compileVoidMarkdownDecks } from "../src/node/void-markdown";
import { resolveDeckFiles } from "../src/routing/file-routing";

describe("Void Markdown decks", () => {
  it("discovers .md only when opted in, preserves MDX, and rejects collisions", () => {
    const paths = ["decks/one.md", "decks/two/deck.md", "decks/two/assets/image.png", "decks/legacy.mdx"];
    expect(resolveDeckFiles(paths).map((deck) => deck.slug)).toEqual(["legacy"]);
    expect(resolveDeckFiles(paths, "decks", { markdown: true }).map((deck) => deck.slug)).toEqual([
      "legacy",
      "one",
      "two",
    ]);
    expect(() => resolveDeckFiles(["decks/one.md", "decks/one.mdx"], "decks", { markdown: true })).toThrow(
      "Deck slug conflict",
    );
    expect(() => resolveDeckFiles(["decks/nested/one.md"], "decks", { markdown: true })).toThrow("Nested deck slugs");
  });

  it("preserves separators inside backtick and tilde fences and slide frontmatter", () => {
    const code = "```md\n---\ntitle: literal\n---\n```";
    const tilde = "~~~~md\n---\n~~~~~";
    expect(
      splitMarkdownSlides(`# One\n\n${code}\n\n---\ntitle: Two\nnotes: Speaker note\n---\n# Two\n\n${tilde}`),
    ).toEqual([`# One\n\n${code}`, `---\ntitle: Two\nnotes: Speaker note\n---\n# Two\n\n${tilde}`]);
    expect(splitMarkdownSlides("# One\n\n    ---\n    code")).toHaveLength(1);
    expect(() => splitMarkdownSlides("```md\n---")).toThrow("code fence is not closed");
    expect(splitMarkdownSlides("# HONO_DECKS_FENCE_0_END\n\n```md\nhello\n```")[0]).toContain(
      "# HONO_DECKS_FENCE_0_END",
    );
  });

  it("does not load an optional compiler when a collection has only MDX", async () => {
    const generated = await compileVoidMarkdownDecks({
      root: "decks",
      outDir: "generated",
      decks: [],
      readText: async () => "",
    });
    expect(generated.decks).toEqual([]);
  });

  it("keeps static decks compatible with the original standalone compiler API", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "legacy-markdown-api-"));
    try {
      const pkg = join(cwd, "node_modules/void-plugin-hono-jsx");
      await mkdir(pkg, { recursive: true });
      await writeFile(
        join(pkg, "package.json"),
        JSON.stringify({ type: "module", exports: { "./markdown/compiler": "./index.js" } }),
      );
      await writeFile(
        join(pkg, "index.js"),
        `export function readStaticMarkdown(content) { return { frontmatter: {}, content, script: "" }; }
export async function compileStaticMarkdown() { return { code: "export default function Slide() { return 'legacy'; }", headings: [], clientCode: "" }; }`,
      );
      // Installing an independent compiler must not silently switch an older
      // provider's context when a legacy configuration is still in use.
      const common = join(cwd, "node_modules/@ts-76/hono-markdown");
      await mkdir(common, { recursive: true });
      await writeFile(
        join(common, "package.json"),
        JSON.stringify({ type: "module", exports: { "./compiler": "./index.js" } }),
      );
      await writeFile(join(common, "index.js"), 'throw new Error("Unexpected provider switch");');
      const output = await compileVoidMarkdownDecks({
        cwd,
        root: "decks",
        outDir: "generated",
        decks: [{ slug: "old", sourcePath: "decks/old.md", kind: "single-file", assetPaths: [] }],
        readText: async () => "# Old",
      });
      expect(output.decks[0].slideModules[0].code).toContain("legacy");
      expect(output.decks[0].deck.clientEntryRequired).toBe(false);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("explains the missing public compiler dependency", async () => {
    await expect(
      compileVoidMarkdownDecks({
        cwd: "/tmp/hono-decks-no-optional-peer",
        root: "decks",
        outDir: "generated",
        decks: [{ slug: "one", sourcePath: "decks/one.md", kind: "single-file", assetPaths: [] }],
        readText: async () => "# One",
      }),
    ).rejects.toThrow("public /markdown/compiler API");
  });
});
