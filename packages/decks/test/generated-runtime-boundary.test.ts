import { describe, expect, it } from "vitest";
import { emitDeckComponentRegistryModule } from "../src/generator/component-registry";
import { emitDeckManifestModule } from "../src/generator/manifest-generator";
import { emitModuleDecksRouter } from "../src/generator/mdx/emit";
import { DECKS_RUNTIME_ENTRY } from "../src/generator/package-entry";
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

    expect(DECKS_RUNTIME_ENTRY).toBe("@hono/decks");
    for (const source of modules) {
      expect(source).toContain(`from ${runtimeEntry}`);
      expect(source).not.toContain("@hono/decks/runtime");
    }
  });

  it("exports the helpers required by generated modules from the runtime entry", async () => {
    const runtime = await import("../src/mod");

    expect(typeof runtime.defineDecks).toBe("function");
    expect(typeof runtime.defineSlideComponents).toBe("function");
  });
});
