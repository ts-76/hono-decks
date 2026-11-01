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
          { breaking: true, release: "major" },
          { type: "feat", release: "minor" },
          { type: "fix", scope: "ci", release: false },
          { type: "fix", scope: "!(ci)", release: "patch" },
          { type: "perf", release: "patch" },
        ],
      },
    ],
    // Stable generator 14 uses writer 8; keep the root preset on 9.x until
    // a stable writer-9 generator is available. scripts/release-notes.test.mjs
    // verifies the installed pair renders the actual notes before publication.
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    ["@semantic-release/npm", { pkgRoot: packageRoot }],
    "@semantic-release/github",
  ],
};
