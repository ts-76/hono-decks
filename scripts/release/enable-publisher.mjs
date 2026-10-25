import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { archiveContents, pack } from "./npm-command.mjs";
import { publisherEnvironment, verifyPublisher } from "./publisher.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.GITHUB_REPOSITORY, "ts-76/hono-decks");
assert.ok(process.env.RELEASE_CLI && process.env.RUNNER_TEMP && process.env.GITHUB_ENV);
verifyPublisher(process.env.RELEASE_CLI);
const root = mkdtempSync(path.join(process.env.RUNNER_TEMP, "npm-tested-"));
const auth = path.join(root, "empty.npmrc");
writeFileSync(auth, "");
const env = { ...publisherEnvironment(process.env, root), NPM_CONFIG_USERCONFIG: auth };
const archive = pack(process.env.RELEASE_CLI, path.resolve("packages/decks"), root, env);
const contents = path.join(root, "tested-contents.json");
writeFileSync(contents, JSON.stringify(archiveContents(archive)));
appendFileSync(process.env.GITHUB_ENV, `PUBLISHER_TESTED_CONTENTS=${contents}\nNPM_CONFIG_IGNORE_SCRIPTS=true\n`);
const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";
const bin = path.resolve("node_modules/.bin/npm");
mkdirSync(path.dirname(bin), { recursive: true });
rmSync(bin, { force: true });
writeFileSync(
  bin,
  `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(path.resolve("scripts/release/npm-command.mjs"))} "$@"\n`,
  { mode: 0o700 },
);
