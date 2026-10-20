import { defineConfig } from "vite";
import build from "@hono/vite-build/node";
import honox, { devServerDefaultOptions } from "honox/vite";

// Keep this application-owned config, including unrelated settings.
export default defineConfig(async () => ({
  base: "/dev-assets/",
  plugins: [honox({ islands: false, devServer: { base: undefined, exclude: [...devServerDefaultOptions.exclude, /^\/dev-assets\/(?:@|node_modules\/|\.vite\/)/] } }), build({ port: 5397, minify: false })],
  build: { sourcemap: true },
  define: { __APP_CONFIG_PRESERVED__: JSON.stringify("preserved") },
}));
