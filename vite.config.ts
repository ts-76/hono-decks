import { defineConfig } from "vite-plus";

export default defineConfig({
  check: {
    // Enable after landing a dedicated repository-wide Oxfmt baseline.
    fmt: false,
  },
  fmt: {
    ignorePatterns: [
      ".agents/**",
      ".beads/**",
      ".claude/**",
      ".codex/**",
      ".design-qa/**",
      ".impeccable/**",
      ".captures/**",
      "**/dist/**",
      "**/dist-dry-run/**",
      "**/generated/**",
      "**/vendor/**",
      "**/*.md",
      "**/*.mdx",
    ],
    printWidth: 120,
  },
  lint: {
    ignorePatterns: [
      ".agents/**",
      ".beads/**",
      ".claude/**",
      ".codex/**",
      ".design-qa/**",
      ".impeccable/**",
      ".captures/**",
      "**/dist/**",
      "**/dist-dry-run/**",
      "**/generated/**",
      "**/vendor/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
