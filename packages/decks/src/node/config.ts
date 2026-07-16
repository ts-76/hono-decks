import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { Env } from "hono";
import type { DecksConfig } from "../server/define-decks";

export const DEFAULT_DECKS_CONFIG_FILE = "hono-decks.config.ts";

export interface LoadedDecksConfig<E extends Env = any> {
  path: string;
  config: DecksConfig<E>;
  root: string;
  outDir: string;
  ogpCacheFile?: string;
}

export async function loadDecksConfig<E extends Env = any>(input: {
  cwd: string;
  configFile?: string;
}): Promise<LoadedDecksConfig<E>> {
  const path = resolve(input.cwd, input.configFile ?? DEFAULT_DECKS_CONFIG_FILE);
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${input.configFile ?? DEFAULT_DECKS_CONFIG_FILE}. Run \`hono-decks init\` first.`);
  }

  const result = await build({
    absWorkingDir: input.cwd,
    entryPoints: [path],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
    alias: {
      "hono-decks": resolveRuntimeEntry(),
    },
  });
  const source = result.outputFiles[0]?.text;
  if (!source) throw new Error(`Could not load config file: ${path}`);

  const module = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}#${Date.now()}`) as {
    default?: DecksConfig<E>;
  };
  const config = module.default;
  if (!config || typeof config !== "object") throw new Error(`Config must have a default export: ${path}`);
  if (typeof config.mountPath !== "string") throw new Error(`Config mountPath must be a string: ${path}`);

  return {
    path,
    config,
    root: config.build?.root ?? "decks",
    outDir: config.build?.outDir ?? "src/generated",
    ogpCacheFile: config.build?.ogpCacheFile,
  };
}

function resolveRuntimeEntry(): string {
  const built = fileURLToPath(new URL("./mod.js", import.meta.url));
  if (existsSync(built)) return built;
  return fileURLToPath(new URL("../mod.ts", import.meta.url));
}
