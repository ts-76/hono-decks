import { defineConfig, type UserConfig } from "tsdown";

const entries = {
  mod: "src/mod.ts",
  advanced: "src/advanced.ts",
  cli: "src/cli.ts",
  client: "src/client.ts",
  node: "src/node.ts",
  vite: "src/vite.ts",
  bin: "src/bin.ts",
};

const configs: UserConfig[] = Object.entries(entries).map(([name, entry]) => ({
  entry: { [name]: entry },
  format: "esm",
  target: "es2022",
  dts: true,
  clean: true,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  sourcemap: false,
}));

export default defineConfig(configs);
