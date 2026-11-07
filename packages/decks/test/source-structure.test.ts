import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const srcRoot = join(import.meta.dirname, "..", "src");

/** Directories bundled into Workers. They must stay free of Node built-ins and build-time dependencies. */
const runtimeLayers = ["client", "deck", "renderer", "server", "shared", "source"];
/** Directories that only run in Node (CLI, Vite plugin, compiler). */
const buildLayers = ["adapters", "compiler", "generator", "node", "parser", "routing"];
const buildOnlyPackages = /^(?:node:|@mdx-js\/|esbuild$|remark-|unified$|shiki$|@babel\/|vite$)/;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return Promise.resolve(path.endsWith(".ts") && !path.endsWith(".d.ts") ? [path] : []);
    }),
  );
  return files.flat();
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)(?!\s+type\b)[^"';]*?from\s+["']([^"']+)["']/g)].map(
    (match) => match[1]!,
  );
}

function layerOf(path: string): string {
  return relative(srcRoot, path).split("/")[0]!;
}

describe("source layering", () => {
  it("keeps Worker runtime layers free of Node built-ins and build-time packages", async () => {
    const violations: string[] = [];
    for (const layer of runtimeLayers) {
      for (const file of await sourceFiles(join(srcRoot, layer))) {
        const source = await readFile(file, "utf8");
        for (const specifier of importSpecifiers(source)) {
          if (buildOnlyPackages.test(specifier)) violations.push(`${relative(srcRoot, file)} -> ${specifier}`);
          if (specifier.startsWith(".")) {
            const target = layerOf(resolve(dirname(file), specifier));
            if (buildLayers.includes(target)) violations.push(`${relative(srcRoot, file)} -> ${specifier}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps the root and advanced entries on the runtime side", async () => {
    for (const entry of ["mod.ts", "advanced.ts", "client.ts", "remote.ts"]) {
      const source = await readFile(join(srcRoot, entry), "utf8");
      for (const specifier of importSpecifiers(source)) {
        expect(buildOnlyPackages.test(specifier), `${entry} -> ${specifier}`).toBe(false);
        if (specifier.startsWith(".")) {
          expect(buildLayers, `${entry} -> ${specifier}`).not.toContain(layerOf(resolve(srcRoot, specifier)));
        }
      }
    }
  });
});
