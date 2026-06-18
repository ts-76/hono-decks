export interface EmitDecksRouterModuleInput {
  manifestModulePath: string;
  componentRegistryModulePath?: string;
}

export function emitDecksRouterModule(input: EmitDecksRouterModuleInput): string {
  const componentImport = input.componentRegistryModulePath
    ? `import { deckComponents } from ${JSON.stringify(input.componentRegistryModulePath)};\n`
    : "";
  const componentsOption = input.componentRegistryModulePath ? ",\n  components: deckComponents" : "";

  return `import { defineDecks } from "@hono/decks";
import type { DecksRouterOverrides } from "@hono/decks";
import { deckManifest } from ${JSON.stringify(input.manifestModulePath)};
${componentImport}
export const decks = defineDecks({
  manifest: deckManifest${componentsOption}
});

export function decksRouter(options: DecksRouterOverrides = {}) {
  return decks.router(options);
}
`;
}
