import { defineConfig } from "vite";
import build from "@hono/vite-build/node";
import devServer, { defaultOptions as devServerDefaults } from "@hono/vite-dev-server";

// Keep this application-owned config, including unrelated settings.
export default defineConfig(async () => ({
  base: "/dev-assets/",
  plugins: [devServer({ entry: "src/index.ts", exclude: [...devServerDefaults.exclude, /^\/dev-assets\/(?:@|node_modules\/|\.vite\/)/] }), build({ port: 5395, minify: false })],
  build: { sourcemap: true },
  define: { __APP_CONFIG_PRESERVED__: JSON.stringify("preserved") },
}));
