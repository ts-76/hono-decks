import { DECKS_ADVANCED_ENTRY, DECKS_RUNTIME_ENTRY } from "./package-entry";

export interface EmitDecksRouterModuleInput {
  manifestModulePath: string;
  componentRegistryModulePath?: string;
}

export function emitDecksRouterModule(input: EmitDecksRouterModuleInput): string {
  const runtimeEntry = JSON.stringify(DECKS_RUNTIME_ENTRY);
  const advancedEntry = JSON.stringify(DECKS_ADVANCED_ENTRY);
  const componentImport = input.componentRegistryModulePath
    ? `import { deckComponents } from ${JSON.stringify(input.componentRegistryModulePath)};\n`
    : "";
  const componentsOption = input.componentRegistryModulePath ? ",\n  components: deckComponents" : "";

  return `import { configureDecks, defineDecks } from ${advancedEntry};
import type { ConfiguredDecks, DecksConfig } from ${runtimeEntry};
import type { Env } from "hono";
import { deckManifest } from ${JSON.stringify(input.manifestModulePath)};
${componentImport}
const generatedDecks = defineDecks({
  manifest: deckManifest${componentsOption}
});

export function createDecks<E extends Env = any>(config: DecksConfig<E>): ConfiguredDecks<E> {
  return configureDecks(definedDecksFor<E>(), config);
}

function definedDecksFor<E extends Env>() {
  return generatedDecks;
}
`;
}
