const packageRoot = "packages/decks";

export default {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { breaking: true, release: "minor" },
          { type: "feat", release: "minor" },
          { type: "fix", release: "minor" },
          { type: "perf", release: "minor" },
        ],
      },
    ],
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    ["@semantic-release/npm", { pkgRoot: packageRoot }],
    "@semantic-release/github",
  ],
};
