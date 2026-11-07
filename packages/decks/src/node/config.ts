import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { DecksConfig } from "../server/define-decks";

export const DEFAULT_DECKS_CONFIG_FILE = "hono-decks.config.ts";

export interface LoadedDecksConfig {
  path: string;
  config: DecksConfig;
  /** Absolute config inputs, including imported local settings. */
  dependencies: string[];
  root: string;
  outDir: string;
  ogpCacheFile?: string;
}

export async function loadDecksConfig(input: { cwd: string; configFile?: string }): Promise<LoadedDecksConfig> {
  const packagePath = resolve(input.cwd, "package.json");
  const packageConfig = existsSync(packagePath)
    ? JSON.parse(readFileSync(packagePath, "utf8"))["hono-decks"]?.configFile
    : undefined;
  if (input.configFile === undefined && packageConfig !== undefined && typeof packageConfig !== "string") {
    throw new Error("package.json hono-decks.configFile must be a string");
  }
  const configFile = input.configFile ?? packageConfig ?? DEFAULT_DECKS_CONFIG_FILE;
  const path = resolve(input.cwd, configFile);
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${configFile}. Run \`hono-decks init\` first.`);
  }

  const result = await build({
    absWorkingDir: input.cwd,
    entryPoints: [path],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    metafile: true,
    logLevel: "silent",
    alias: {
      "hono-decks": resolveRuntimeEntry(),
    },
  });
  const source = result.outputFiles[0]?.text;
  if (!source) throw new Error(`Could not load config file: ${path}`);

  const module = (await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}#${Date.now()}`)) as {
    default?: DecksConfig;
  };
  const config = module.default;
  if (!config || typeof config !== "object") throw new Error(`Config must have a default export: ${path}`);
  if (typeof config.mountPath !== "string") throw new Error(`Config mountPath must be a string: ${path}`);
  const runtimeKeys = ["router", "source"].filter((key) => key in config);
  if (runtimeKeys.length > 0) {
    throw new Error(
      `Config ${runtimeKeys.join(" and ")} moved out of ${DEFAULT_DECKS_CONFIG_FILE} in hono-decks 2.0. ` +
        `The config file is build-only; pass runtime options to createDecks({ source, ...routerOptions }) instead.`,
    );
  }

  if (
    config.build?.markdown !== undefined &&
    config.build.markdown !== "void" &&
    (typeof config.build.markdown !== "object" ||
      !config.build.markdown ||
      typeof config.build.markdown.adapter !== "string" ||
      !config.build.markdown.adapter.trim())
  )
    throw new Error('Config build.markdown must be "void" or an adapter reference.');

  return {
    path,
    config,
    dependencies: Object.keys(result.metafile!.inputs).map((inputPath) => resolve(input.cwd, inputPath)),
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
