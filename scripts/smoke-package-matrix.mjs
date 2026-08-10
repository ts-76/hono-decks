import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const smokeScript = join(repoRoot, "scripts", "smoke-package.mjs");
const viteVersions = ["^6.0.0", "^7.0.0", "^8.0.0"];

for (const viteVersion of viteVersions) {
  console.log(`\nRunning package smoke with Vite ${viteVersion}`);
  execFileSync(process.execPath, [smokeScript], {
    cwd: repoRoot,
    env: { ...process.env, HONO_DECKS_SMOKE_VITE_VERSION: viteVersion },
    stdio: "inherit",
  });
}
