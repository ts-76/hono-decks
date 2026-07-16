import { describe, expect, it } from "vite-plus/test";
import { emitDeckComponentRegistryModule } from "../src/generator/component-registry";
import { emitDeckManifestModule } from "../src/generator/manifest-generator";
import { emitModuleDecksRouter } from "../src/generator/mdx/emit";
import { DECKS_ADVANCED_ENTRY, DECKS_RUNTIME_ENTRY } from "../src/generator/package-entry";
import { emitDecksRouterModule } from "../src/generator/router-generator";

describe("generated runtime boundary", () => {
  it("uses one runtime package entry across generated server modules", () => {
    const runtimeEntry = JSON.stringify(DECKS_RUNTIME_ENTRY);
    const modules = [
      emitModuleDecksRouter({ decks: [] }),
      emitDecksRouterModule({ manifestModulePath: "./manifest" }),
      emitDeckManifestModule({ decks: [] }),
      emitDeckComponentRegistryModule([]),
    ];

    expect(DECKS_RUNTIME_ENTRY).toBe("hono-decks");
    expect(modules[0]).toContain(`from ${JSON.stringify(DECKS_ADVANCED_ENTRY)}`);
    expect(modules[1]).toContain(`from ${JSON.stringify(DECKS_ADVANCED_ENTRY)}`);
    expect(modules[2]).toContain(`from ${runtimeEntry}`);
    expect(modules[3]).toContain(`from ${runtimeEntry}`);
    for (const source of modules) expect(source).not.toContain("hono-decks/runtime");
  });

  it("exports the helpers required by generated modules from the runtime entry", async () => {
    const runtime = await import("../src/mod");
    const advanced = await import("../src/advanced");

    expect(typeof advanced.defineDecks).toBe("function");
    expect(typeof runtime.defineSlideComponents).toBe("function");
  });
});
