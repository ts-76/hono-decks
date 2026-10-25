import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  auditPublisher,
  exchangeOidc,
  measurePublisherCoverage,
  publisherEnvironment,
  registry,
  verifyPublisher,
} from "./publisher.mjs";

export function withoutUserConfig(args) {
  const output = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--userconfig") {
      assert.ok(args[++i]);
      continue;
    }
    if (args[i].startsWith("--userconfig=")) continue;
    output.push(args[i]);
  }
  return output;
}

export function publishRequest(args, packageRoot) {
  const clean = withoutUserConfig(args);
  assert.equal(clean[0], "publish");
  assert.equal(realpathSync(clean[1]), realpathSync(packageRoot), "Unexpected package directory");
  const options = clean.slice(2);
  assert.deepEqual(options, ["--tag", "latest", "--registry", registry], "Unexpected publication options");
  return { tag: "latest" };
}

export function archiveContents(archive) {
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n");
  assert.equal(new Set(names).size, names.length);
  return Object.fromEntries(
    names.map((name) => {
      assert.ok(name.startsWith("package/") && !name.split("/").includes("..") && !name.endsWith("/"));
      const bytes = execFileSync("tar", ["-xOzf", archive, name]);
      return [
        name,
        name === "package/package.json" ? JSON.parse(bytes) : createHash("sha256").update(bytes).digest("hex"),
      ];
    }),
  );
}

export function assertTestedContents(actual, tested) {
  const actualPackage = actual["package/package.json"];
  assert.equal(actualPackage.name, "hono-decks");
  assert.match(actualPackage.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(
    { ...actual, "package/package.json": { ...actualPackage, version: tested["package/package.json"].version } },
    tested,
    "Package contents changed after quality checks",
  );
}

export function pack(cli, packageRoot, directory, env) {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "pack", packageRoot, "--ignore-scripts", "--workspaces=false", "--json", "--pack-destination", directory],
      { env, encoding: "utf8" },
    ),
  );
  assert.equal(result.length, 1);
  assert.match(result[0].filename, /^hono-decks-\d+\.\d+\.\d+\.tgz$/);
  return path.join(directory, result[0].filename);
}

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "ts-76/hono-decks");
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  const cli = process.env.RELEASE_CLI;
  assert.ok(cli && process.env.RUNNER_TEMP);
  verifyPublisher(cli);
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const packageRoot = path.join(repoRoot, "packages/decks");
  const args = process.argv.slice(2);
  const command = args[0];
  assert.ok(
    ["--version", "config", "version", "pack", "whoami", "ping", "view", "publish"].includes(command),
    "Unsupported publisher command",
  );
  const root = mkdtempSync(path.join(process.env.RUNNER_TEMP, "npm-command-"));
  const auth = path.join(root, "user.npmrc");
  writeFileSync(auth, "", { mode: 0o600 });
  const env = {
    ...publisherEnvironment(process.env, root),
    NPM_CONFIG_USERCONFIG: auth,
    NPM_CONFIG_IGNORE_SCRIPTS: "true",
  };
  try {
    if (command !== "publish") {
      if (command === "version") assert.equal(realpathSync(process.cwd()), realpathSync(packageRoot));
      process.stdout.write(
        execFileSync(process.execPath, [cli, ...withoutUserConfig(args), "--ignore-scripts"], {
          env,
          encoding: "utf8",
        }),
      );
      return;
    }
    const { tag } = publishRequest(args, packageRoot);
    const accepted = pack(cli, packageRoot, root, env);
    assertTestedContents(archiveContents(accepted), JSON.parse(readFileSync(process.env.PUBLISHER_TESTED_CONTENTS)));
    const publisherAudit = await auditPublisher();
    const bytes = readFileSync(accepted);
    const token = await exchangeOidc({ ...process.env, PUBLISH_PACKAGE_NAME: "hono-decks" });
    writeFileSync(auth, `//registry.npmjs.org/:_authToken=${token}\n`, { mode: 0o600 });
    const output = path.join(repoRoot, "artifacts/release");
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, path.basename(accepted)), bytes);
    const coverage = path.join(root, "coverage");
    mkdirSync(coverage);
    // Publish the already compared bytes once, with no directory re-pack or lifecycle hooks.
    process.stdout.write(
      execFileSync(
        process.execPath,
        [
          cli,
          "publish",
          accepted,
          "--tag",
          tag,
          "--registry",
          registry,
          "--ignore-scripts",
          "--workspaces=false",
          "--provenance",
        ],
        { cwd: root, env: { ...env, NODE_V8_COVERAGE: coverage }, encoding: "utf8", timeout: 120000 },
      ),
    );
    const reachability = measurePublisherCoverage(cli, coverage);
    writeFileSync(
      path.join(output, "publisher-verification.json"),
      JSON.stringify(
        {
          commit: process.env.GITHUB_SHA,
          version: archiveContents(accepted)["package/package.json"].version,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          publisherAudit,
          reachability,
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
