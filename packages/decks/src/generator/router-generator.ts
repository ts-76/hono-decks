import { DECKS_RUNTIME_ENTRY } from "./package-entry";

export interface EmitDecksRouterModuleInput {
  manifestModulePath: string;
  componentRegistryModulePath?: string;
}

export function emitDecksRouterModule(input: EmitDecksRouterModuleInput): string {
  const runtimeEntry = JSON.stringify(DECKS_RUNTIME_ENTRY);
  const componentImport = input.componentRegistryModulePath
    ? `import { deckComponents } from ${JSON.stringify(input.componentRegistryModulePath)};\n`
    : "";
  const componentsOption = input.componentRegistryModulePath ? ",\n  components: deckComponents" : "";

  return `import { defineDecks } from ${runtimeEntry};
import type { DecksRouterOverrides } from ${runtimeEntry};
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
