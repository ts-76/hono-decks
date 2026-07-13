import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    mod: "src/mod.ts",
    cli: "src/cli.ts",
    client: "src/client.ts",
    node: "src/node.ts",
    bin: "src/bin.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
});
