import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCommits } from "@semantic-release/commit-analyzer";
import { generateNotes } from "@semantic-release/release-notes-generator";
import releaseConfig from "../release.config.mjs";

test("the locked release plugins produce a patch and complete linked release notes", async () => {
  const pluginOptions = (name) =>
    releaseConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name)[1];
  const context = {
    cwd: process.cwd(),
    logger: { log() {} },
    options: { repositoryUrl: "https://github.com/ts-76/hono-decks" },
    commits: [
      { hash: "1234567890abcdef1234567890abcdef12345678", message: "fix(deps): consolidate dependency updates (#58)" },
      { hash: "abcdef1234567890abcdef1234567890abcdef12", message: "chore(release): restore compatible release notes" },
    ],
    lastRelease: { version: "1.4.3", gitTag: "v1.4.3" },
    nextRelease: { version: "1.4.4", gitTag: "v1.4.4" },
  };

  assert.equal(await analyzeCommits(pluginOptions("@semantic-release/commit-analyzer"), context), "patch");
  const notes = await generateNotes(pluginOptions("@semantic-release/release-notes-generator"), context);
  assert.match(notes, /1\.4\.4/);
  assert.match(notes, /Bug Fixes/);
  assert.match(notes, /consolidate dependency updates/);
  assert.match(notes, /https:\/\/github\.com\/ts-76\/hono-decks\/issues\/58/);
  assert.match(notes, /https:\/\/github\.com\/ts-76\/hono-decks\/compare\/v1\.4\.3\.\.\.v1\.4\.4/);
});
