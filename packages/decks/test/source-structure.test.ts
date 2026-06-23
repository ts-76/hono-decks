import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(import.meta.dirname, "..", "src");

describe("source directory structure", () => {
  it("keeps deck as the domain model category and separates parser renderer generator source and routing", async () => {
    await expect(readdir(join(srcRoot, "parser"))).resolves.toContain("parser.ts");
    await expect(readdir(join(srcRoot, "renderer"))).resolves.toEqual(
      expect.arrayContaining([
        "asset-rewrite.ts",
        "compiled-render.ts",
        "jsx-renderer.ts",
        "presentation-page.ts",
        "presentation-script.ts",
        "presentation-style.ts",
        "render-block.ts",
        "render.ts",
      ]),
    );
    await expect(readdir(join(srcRoot, "server"))).resolves.toEqual(
      expect.arrayContaining(["viewer.ts", "viewer-script.ts", "viewer-style.ts"]),
    );
    await expect(readdir(join(srcRoot, "client"))).resolves.toContain("islands.ts");
    await expect(readdir(join(srcRoot, "compiler"))).resolves.toContain("compiler.ts");
    await expect(readdir(join(srcRoot, "generator"))).resolves.toEqual(
      expect.arrayContaining([
        "assets.ts",
        "component-registry.ts",
        "manifest-generator.ts",
        "mdx-module-generator.ts",
        "router-generator.ts",
      ]),
    );
    await expect(readdir(join(srcRoot, "source"))).resolves.toContain("manifest-source.ts");
    await expect(readdir(join(srcRoot, "routing"))).resolves.toContain("file-routing.ts");

    await expect(readdir(join(srcRoot, "deck"))).resolves.toEqual(
      expect.arrayContaining(["assets.ts", "frontmatter.ts", "model.ts"]),
    );
  });

  it("keeps generated local asset ref helpers in the generator asset module", async () => {
    const manifestGenerator = await readFile(join(srcRoot, "generator", "manifest-generator.ts"), "utf8");
    const mdxAssets = await readFile(join(srcRoot, "generator", "mdx", "assets.ts"), "utf8");
    const generatorAssets = await readFile(join(srcRoot, "generator", "assets.ts"), "utf8");

    expect(manifestGenerator).not.toMatch(/function\s+(buildAssetRefs|assetName|normalizeMountPath|normalizePath)\b/);
    expect(mdxAssets).not.toMatch(/function\s+(buildAssetRefs|assetName|normalizeMountPath)\b/);
    expect(generatorAssets).toMatch(/export\s+async\s+function\s+buildAssetRefs\b/);
    expect(generatorAssets).toMatch(/function\s+assetName\b/);
  });

  it("keeps shared deck parsing and external asset warning contracts out of entry modules", async () => {
    const compiler = await readFile(join(srcRoot, "compiler", "compiler.ts"), "utf8");
    const mdxModuleGenerator = await readFile(join(srcRoot, "generator", "mdx-module-generator.ts"), "utf8");
    const deckAssets = await readFile(join(srcRoot, "deck", "assets.ts"), "utf8");
    const deckFrontmatter = await readFile(join(srcRoot, "deck", "frontmatter.ts"), "utf8");

    expect(compiler).not.toMatch(/function\s+addExternalAssetWarnings\b/);
    expect(mdxModuleGenerator).not.toMatch(/function\s+addExternalAssetWarnings\b/);
    expect(deckAssets).toMatch(/export\s+function\s+addExternalAssetWarnings\b/);

    expect(compiler).not.toMatch(/function\s+splitSlideSources\b/);
    expect(mdxModuleGenerator).not.toMatch(/function\s+splitSlideSources\b/);
    expect(deckFrontmatter).toMatch(/export\s+function\s+splitSlideSources\b/);
  });

  it("uses structured parser warning codes for generated MDX warning selection", async () => {
    const mdxModuleGenerator = await readFile(join(srcRoot, "generator", "mdx-module-generator.ts"), "utf8");

    expect(mdxModuleGenerator).not.toContain('includes("code fence is not closed")');
    expect(mdxModuleGenerator).toContain('"code-fence-unclosed"');
  });

  it("keeps parser warning creation as returned values instead of shared mutable accumulators", async () => {
    const parser = await readFile(join(srcRoot, "parser", "parser.ts"), "utf8");
    const mdxModuleGenerator = await readFile(join(srcRoot, "generator", "mdx-module-generator.ts"), "utf8");

    expect(parser).not.toMatch(/warnings\.push\(/);
    expect(parser).not.toMatch(/function\s+addParserWarning\b/);
    expect(parser).not.toMatch(/\([^)]*,\s*warnings:\s*ParserWarning\[\]/);
    expect(mdxModuleGenerator).not.toContain('warnings.push({ code: "parse-warning"');
  });

  it("keeps presentation page style and script bodies outside compiled render", async () => {
    const compiledRender = await readFile(join(srcRoot, "renderer", "compiled-render.ts"), "utf8");
    const presentationPage = await readFile(join(srcRoot, "renderer", "presentation-page.ts"), "utf8");
    const presentationStyle = await readFile(join(srcRoot, "renderer", "presentation-style.ts"), "utf8");
    const presentationScript = await readFile(join(srcRoot, "renderer", "presentation-script.ts"), "utf8");

    expect(compiledRender).not.toContain("function renderCompiledDeckPage");
    expect(compiledRender).not.toContain("function basePresentationStyle");
    expect(compiledRender).not.toContain("function renderPresentationScript");
    expect(presentationPage).toContain("renderCompiledDeckPage");
    expect(presentationStyle).toContain("basePresentationStyle");
    expect(presentationScript).toContain("renderPresentationScript");
  });

  it("keeps viewer style and script bodies outside the viewer orchestration module", async () => {
    const viewer = await readFile(join(srcRoot, "server", "viewer.ts"), "utf8");
    const viewerStyle = await readFile(join(srcRoot, "server", "viewer-style.ts"), "utf8");
    const viewerScript = await readFile(join(srcRoot, "server", "viewer-script.ts"), "utf8");

    expect(viewer).not.toContain("function baseViewerStyle");
    expect(viewer).not.toContain("function renderViewerScript");
    expect(viewerStyle).toContain("baseViewerStyle");
    expect(viewerScript).toContain("renderViewerScript");
  });
});
