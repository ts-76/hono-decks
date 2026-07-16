import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";

describe("development scripts", () => {
  it("runs wrangler dev with non-interactive workspace-local configuration", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies["hono-decks"]).toBe("0.1.0");
    expect(packageJson.scripts["decks:compile"]).toBe("hono-decks compile");
    expect(packageJson.scripts["decks:compile:hook"]).toBe("hono-decks compile");
    expect(packageJson.scripts["decks:watch"]).toBeUndefined();
    expect(packageJson.scripts.dev).not.toContain("decks:compile");
    expect(packageJson.scripts.dev).not.toContain("../../packages/decks");
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
    expect(wranglerJson).not.toContain('"alias"');
    expect(wranglerJson).not.toContain("../../packages/decks");
  });

  it("uses a binding-light production config for the public sample", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };
    const productionConfig = await readFile(new URL("../wrangler.production.jsonc", import.meta.url), "utf8");

    expect(packageJson.scripts.deploy).toBe("wrangler deploy");
    expect(packageJson.scripts["deploy:production"]).toContain("--config wrangler.production.jsonc");
    expect(productionConfig).toContain('"pattern": "basic.hono-decks.com"');
    expect(productionConfig).toContain('"custom_domain": true');
    expect(productionConfig).not.toContain('"binding": "DECK_ASSETS"');
    expect(productionConfig).not.toContain('"alias"');
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
