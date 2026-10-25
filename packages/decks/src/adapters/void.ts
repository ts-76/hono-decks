/** Dependency policy of the Void preset, outside the deck compiler. */
export const voidDependencies = [
  ["void", "void@>=1.2.1 <1.3.0"],
  ["vite", "vite@^8.0.16"],
  ["hono", "hono@^4.13.13"],
  ["yaml", "yaml@^2.9.1"],
  ["shiki", "shiki@^4.5.0"],
  ["@shikijs/transformers", "@shikijs/transformers@^4.5.0"],
];

/** Pre-0.9 adapters on existing Void 1.1 hosts still use parser peers. */
export const legacyMarkdownDependencies = [
  ["markdown-exit", "markdown-exit@^1.3.0"],
  ["markdown-it-container", "markdown-it-container@^4.0.0"],
];
