import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";

describe("development scripts", () => {
  it("runs wrangler dev with non-interactive workspace-local configuration", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    const publishedPackage = JSON.parse(
      await readFile(new URL("../../../packages/decks/package.json", import.meta.url), "utf8"),
    ) as { version: string };

    expect(packageJson.dependencies["hono-decks"]).toBe(publishedPackage.version);
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
    expect(source).toContain('data-hono-decks-mobile-navigation="next"');
    expect(source).toContain('querySelector(".slide:not([hidden])")');
    expect(source).toContain('touchEvent("touchstart"');
    expect(source).not.toContain("data-viewer-navigation");
  });

  it("starts PDF smoke wrangler with non-interactive workspace-local configuration", async () => {
    const source = await readFile(new URL("../scripts/pdf-smoke.mjs", import.meta.url), "utf8");

    expect(source).toContain('const wranglerConfigHome = path.join(cwd, ".wrangler-config");');
    expect(source).toContain('CI: "1"');
    expect(source).toContain("XDG_CONFIG_HOME: wranglerConfigHome");
    expect(source).toContain('NO_COLOR: "1"');
  });

  it("keeps Browser Run smoke on the deployed export route", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };
    const source = await readFile(new URL("../scripts/browser-run-smoke.mjs", import.meta.url), "utf8");

    expect(packageJson.scripts["smoke:browser-run"]).toBe("node scripts/browser-run-smoke.mjs");
    expect(source).toContain("/export.pdf");
    expect(source).toContain("HONO_DECKS_BROWSER_RUN_ORIGIN");
    expect(source).toContain("HONO_DECKS_BROWSER_RUN_TOKEN");
    expect(source).not.toContain("agent-browser");
    expect(source).not.toContain("wrangler dev");
  });

  it("keeps Browser Run workflow credentialed and manually triggered", async () => {
    const workflow = await readFile(
      new URL("../../../.github/workflows/browser-run-smoke.yml", import.meta.url),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("environment:");
    expect(workflow).toContain("name: browser-run-smoke");
    expect(workflow).toContain("vars.HONO_DECKS_BROWSER_RUN_ORIGIN");
    expect(workflow).toContain("HONO_DECKS_BROWSER_RUN_TOKEN");
    expect(workflow).toContain("github.ref != 'refs/heads/main'");
    expect(workflow).toContain("bun run smoke:browser-run");
    expect(workflow).toContain("actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a");
    expect(workflow).not.toContain("agent-browser");
    expect(workflow).not.toContain("smoke:pdf");
    expect(workflow).not.toContain("inputs.origin");
  });
});
