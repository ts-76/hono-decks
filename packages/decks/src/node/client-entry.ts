import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build as buildBrowserBundle } from "esbuild";

export interface ClientEntryModule {
  slug: string;
  sourcePath: string;
}

export async function discoverClientComponentIds(input: {
  cwd: string;
  clientEntries: ClientEntryModule[];
}): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {};
  for (const entry of input.clientEntries) {
    const source = await readFile(join(input.cwd, entry.sourcePath), "utf8");
    const exports = extractComponentExportNames(source);
    result[entry.slug] = Object.fromEntries(exports.map((name) => [name, clientComponentId(entry.slug, name)]));
  }
  return result;
}

export async function emitClientEntryModule(input: {
  cwd: string;
  clientEntries: ClientEntryModule[];
  clientComponentIds: Record<string, Record<string, string>>;
}): Promise<string> {
  const imports: string[] = [];
  const registrations: string[] = [];

  for (const entry of input.clientEntries) {
    const ids = input.clientComponentIds[entry.slug] ?? {};
    for (const [exportName, clientId] of Object.entries(ids)) {
      const localName = clientImportName(entry.slug, exportName);
      imports.push(`import { ${exportName} as ${localName} } from ${JSON.stringify(join(input.cwd, entry.sourcePath))};`);
      registrations.push(`${JSON.stringify(clientId)}: ${localName}`);
    }
  }

  if (registrations.length === 0) return 'export const decksClientEntry = "";\n';

  const entryContents = `import { hydrateSlideIslands } from "hono-decks/client";
${imports.join("\n")}

hydrateSlideIslands({
  components: {
    ${registrations.join(",\n    ")}
  }
});
`;
  const result = await buildBrowserBundle({
    stdin: {
      contents: entryContents,
      resolveDir: input.cwd,
      sourcefile: "hono-decks-client-entry.tsx",
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "hono/jsx/dom",
    nodePaths: nodeModuleFallbackPaths(input.cwd),
    alias: { "hono-decks/client": resolveClientRuntimeEntry() },
    sourcemap: false,
    minify: false,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error("Client entry did not produce output.");

  return `export const decksClientEntry = ${JSON.stringify(output.text)};\n`;
}

function resolveClientRuntimeEntry(): string {
  const built = fileURLToPath(new URL("./client.js", import.meta.url));
  if (existsSync(built)) return built;
  return fileURLToPath(new URL("../client.ts", import.meta.url));
}

export function extractComponentExportNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bexport\s+function\s+([A-Z][A-Za-z0-9_]*)\b/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s+const\s+([A-Z][A-Za-z0-9_]*)\b/g)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function nodeModuleFallbackPaths(cwd: string): string[] {
  const current = process.cwd();
  return [
    join(cwd, "node_modules"),
    join(cwd, "..", "node_modules"),
    join(cwd, "..", "..", "node_modules"),
    join(current, "node_modules"),
    join(current, "..", "node_modules"),
    join(current, "..", "..", "node_modules"),
  ];
}

function clientComponentId(slug: string, exportName: string): string {
  const base = `${exportName}__${safeIdentifier(slug)}`;
  return `${base}_${hashString(`${slug}:${exportName}`).slice(0, 8)}`;
}

function clientImportName(slug: string, exportName: string): string {
  return `${safeIdentifier(exportName)}__${safeIdentifier(slug)}_${hashString(`${slug}:${exportName}`).slice(0, 8)}`;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function safeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_") || "_";
}
