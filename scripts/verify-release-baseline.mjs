import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../packages/decks/package.json", import.meta.url), "utf8"),
);
const baselineTag = `v${packageJson.version}`;

try {
  execFileSync("git", ["merge-base", "--is-ancestor", `${baselineTag}^{commit}`, "HEAD"], {
    stdio: "ignore",
  });
} catch {
  console.error(
    `Release baseline is missing. Publish hono-decks@${packageJson.version}, tag that commit as ${baselineTag}, and push the tag before running semantic-release.`,
  );
  process.exitCode = 1;
}
