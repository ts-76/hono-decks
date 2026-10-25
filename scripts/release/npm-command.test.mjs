import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertTestedContents, publishRequest, withoutUserConfig } from "./npm-command.mjs";
import { publisherEnvironment } from "./publisher.mjs";

await test("only the tested package, registry and latest tag may be published", () => {
  const root = mkdtempSync(path.join(tmpdir(), "publisher-options-"));
  try {
    const args = [
      "publish",
      root,
      "--userconfig",
      "/ignored/config",
      "--tag",
      "latest",
      "--registry",
      "https://registry.npmjs.org/",
    ];
    assert.deepEqual(publishRequest(args, root), { tag: "latest" });
    for (const replacement of ["--force", "--no-provenance", "--ignore-scripts=false"])
      assert.throws(() => publishRequest([...args, replacement], root), /options/);
    assert.throws(
      () =>
        publishRequest(
          args.map((x) => (x === "latest" ? "other" : x)),
          root,
        ),
      /options/,
    );
    assert.throws(
      () =>
        publishRequest(
          args.map((x) => (x === "https://registry.npmjs.org/" ? "https://untrusted.test/" : x)),
          root,
        ),
      /options/,
    );
    assert.throws(() => publishRequest(args, path.dirname(root)), /directory/);
    assert.deepEqual(withoutUserConfig(["--userconfig=/ignored", "--version"]), ["--version"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

await test("semantic-release may change only the package version after quality checks", () => {
  const tested = {
    "package/package.json": { name: "hono-decks", version: "0.5.0", files: ["dist"] },
    "package/dist/bin.js": "same",
  };
  const actual = structuredClone(tested);
  actual["package/package.json"].version = "1.2.4";
  assert.doesNotThrow(() => assertTestedContents(actual, tested));
  for (const change of [
    (d) => {
      d["package/dist/bin.js"] = "changed";
    },
    (d) => {
      d["package/extra.js"] = "new";
    },
    (d) => {
      delete d["package/dist/bin.js"];
    },
    (d) => {
      d["package/package.json"].files.push("extra");
    },
  ]) {
    const d = structuredClone(actual);
    change(d);
    assert.throws(() => assertTestedContents(d, tested));
  }
});

await test("publication subprocess inherits only fresh OIDC context and isolated configuration", () => {
  const env = publisherEnvironment(
    {
      PATH: "/bin",
      GITHUB_SHA: "commit",
      NPM_TOKEN: "old",
      NODE_AUTH_TOKEN: "old",
      NODE_OPTIONS: "injected",
      HTTPS_PROXY: "proxy",
    },
    "/isolated",
  );
  for (const key of ["NPM_TOKEN", "NODE_AUTH_TOKEN", "NODE_OPTIONS", "HTTPS_PROXY"]) assert.equal(env[key], undefined);
  assert.equal(env.HOME, "/isolated");
  assert.equal(env.GITHUB_SHA, "commit");
});
