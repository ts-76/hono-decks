// oxlint-disable vite-plus/prefer-vite-plus-imports -- standalone standard Vite consumer
import { defineConfig } from "vite";
import { voidPlugin } from "void";
export default defineConfig({ base: "/dev-assets/", plugins: [voidPlugin()] });
