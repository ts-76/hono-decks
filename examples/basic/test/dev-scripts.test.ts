import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";

describe("development scripts", () => {
  it("runs wrangler dev with non-interactive workspace-local configuration", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["decks:compile"]).toMatch(/bin\.js compile$/);
    expect(packageJson.scripts["decks:compile:hook"]).toMatch(/bin\.js compile$/);
    expect(packageJson.scripts["decks:watch"]).toBeUndefined();
    expect(packageJson.scripts.dev).not.toContain("decks:compile");
    expect(packageJson.scripts.dev).toContain("build -- --clean=false");
    expect(packageJson.scripts.dev).toContain("CI=1");
    expect(packageJson.scripts.dev).toContain("XDG_CONFIG_HOME=.wrangler-config");
    expect(packageJson.scripts.dev).toContain("wrangler dev");
    expect(packageJson.scripts.dev).toContain("--live-reload");
    expect(packageJson.scripts.dev).not.toContain("--alias");
  });

  it("uses Wrangler's custom build watcher for deck authoring", async () => {
    const wranglerJson = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");

    expect(wranglerJson).toContain('"command": "bun run decks:compile:hook"');
    expect(wranglerJson).toContain('"watch_dir": ["decks"]');
    expect(wranglerJson).toContain('"alias"');
    expect(wranglerJson).toContain('"hono-decks": "../../packages/decks/src/mod.ts"');
    expect(wranglerJson).toContain('"hono-decks/advanced": "../../packages/decks/src/advanced.ts"');
    expect(wranglerJson).toContain('"hono-decks/client": "../../packages/decks/src/client.ts"');
  });

  it("starts viewport smoke wrangler with non-interactive workspace-local configuration", async () => {
    const source = await readFile(new URL("../scripts/viewport-smoke.mjs", import.meta.url), "utf8");

    expect(source).toContain('const wranglerConfigHome = path.join(cwd, ".wrangler-config");');
    expect(source).toContain('CI: "1"');
    expect(source).toContain("XDG_CONFIG_HOME: wranglerConfigHome");
    expect(source).toContain('NO_COLOR: "1"');
  });

  it("starts PDF smoke wrangler with non-interactive workspace-local configuration", async () => {
    const source = await readFile(new URL("../scripts/pdf-smoke.mjs", import.meta.url), "utf8");

    expect(source).toContain('const wranglerConfigHome = path.join(cwd, ".wrangler-config");');
    expect(source).toContain('CI: "1"');
    expect(source).toContain("XDG_CONFIG_HOME: wranglerConfigHome");
    expect(source).toContain('NO_COLOR: "1"');
  });
});
