import { describe, expect, it } from "vite-plus/test";
import { emitDeckComponentRegistryModule } from "../src/generator/component-registry";
import { emitDeckManifestModule } from "../src/generator/manifest-generator";
import { emitModuleDecksRouter } from "../src/generator/mdx/emit";
import { DECKS_ADVANCED_ENTRY, DECKS_RUNTIME_ENTRY } from "../src/generator/package-entry";

describe("generated runtime boundary", () => {
  it("uses one runtime package entry across generated server modules", () => {
    const runtimeEntry = JSON.stringify(DECKS_RUNTIME_ENTRY);
    const modules = [
      emitModuleDecksRouter({ decks: [] }),
      emitDeckManifestModule({ decks: [] }),
      emitDeckComponentRegistryModule([]),
    ];

    expect(DECKS_RUNTIME_ENTRY).toBe("hono-decks");
    expect(modules[0]).toContain(`from ${JSON.stringify(DECKS_ADVANCED_ENTRY)}`);
    expect(modules[1]).toContain(`from ${runtimeEntry}`);
    expect(modules[2]).toContain(`from ${runtimeEntry}`);
    for (const source of modules) expect(source).not.toContain("hono-decks/runtime");
  });

  it("emits a typed module without @ts-nocheck or unused helpers", () => {
    const source = emitModuleDecksRouter({ decks: [], mountPath: "/talks/" });
    expect(source).not.toContain("@ts-nocheck");
    expect(source).not.toContain("withClientComponentIds");
    expect(source).not.toMatch(/from ["'][^"']*hono-decks\.config/);
    expect(source).toContain('export const mountPath = "/talks";');
    expect(source).toContain("export function createDecks<E extends Env = any>(options?: DecksOptions<E>)");
  });

  it("keeps Node-only build APIs out of the Worker-safe advanced entry", async () => {
    const advanced = await import("../src/advanced");
    expect(advanced).not.toHaveProperty("compileDecks");
    expect(advanced).not.toHaveProperty("loadDecksConfig");
    expect(advanced).not.toHaveProperty("deckMiddleware");
  });

  it("exports the helpers required by generated modules from the runtime entry", async () => {
    const runtime = await import("../src/mod");
    const advanced = await import("../src/advanced");

    expect(typeof advanced.configureDecks).toBe("function");
    expect(typeof advanced.withClientComponentIds).toBe("function");
    expect(typeof runtime.defineSlideComponents).toBe("function");
  });
});
