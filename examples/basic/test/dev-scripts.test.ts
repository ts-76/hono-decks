import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("development scripts", () => {
  it("runs wrangler dev with non-interactive workspace-local configuration", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["decks:compile:dev"]).toContain("--clean=false");
    expect(packageJson.scripts.dev).toContain("bun run decks:compile:dev");
    expect(packageJson.scripts.dev).toContain("CI=1");
    expect(packageJson.scripts.dev).toContain("XDG_CONFIG_HOME=.wrangler-config");
    expect(packageJson.scripts.dev).toContain("wrangler dev");
    expect(packageJson.scripts.dev).not.toContain("--alias");
  });

  it("configures Wrangler module aliases for stable reloads", async () => {
    const wranglerToml = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");

    expect(wranglerToml).toContain("[alias]");
    expect(wranglerToml).toContain('"@hono/decks" = "../../packages/decks/src/mod.ts"');
    expect(wranglerToml).toContain('"@hono/decks/client" = "../../packages/decks/src/client.ts"');
  });

  it("starts viewport smoke wrangler with non-interactive workspace-local configuration", async () => {
    const source = await readFile(new URL("../scripts/viewport-smoke.mjs", import.meta.url), "utf8");

    expect(source).toContain('const wranglerConfigHome = path.join(cwd, ".wrangler-config");');
    expect(source).toContain('CI: "1"');
    expect(source).toContain('XDG_CONFIG_HOME: wranglerConfigHome');
    expect(source).toContain('NO_COLOR: "1"');
  });

  it("starts PDF smoke wrangler with non-interactive workspace-local configuration", async () => {
    const source = await readFile(new URL("../scripts/pdf-smoke.mjs", import.meta.url), "utf8");

    expect(source).toContain('const wranglerConfigHome = path.join(cwd, ".wrangler-config");');
    expect(source).toContain('CI: "1"');
    expect(source).toContain('XDG_CONFIG_HOME: wranglerConfigHome');
    expect(source).toContain('NO_COLOR: "1"');
  });
});
