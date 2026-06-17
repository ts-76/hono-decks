import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    mod: "src/mod.ts",
    cli: "src/cli.ts",
    node: "src/node.ts",
    index: "src/index.ts",
    bin: "src/bin.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
});
