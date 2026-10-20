import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapter = process.env.VOID_HONO_PACKAGE;
const packageManager = process.env.CONSUMER_PACKAGE_MANAGER ?? "npm";
assert.ok(["npm", "pnpm"].includes(packageManager));
if (!adapter) throw new Error("Set VOID_HONO_PACKAGE to the built adapter tarball with /markdown/compiler.");
const root = await mkdtemp(join(tmpdir(), "hono-decks-void-markdown-"));
const app = join(root, "app");
await cp(join(repo, "fixtures/void-markdown"), app, { recursive: true });
const run = (command, args, cwd = app) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
const packed = JSON.parse(
  run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], join(repo, "packages/decks")),
);
console.log(`Consumer: ${app}`);
const initialPackage = JSON.parse(await readFile(join(app, "package.json"), "utf8"));
for (const name of ["markdown-exit", "yaml", "markdown-it-container", "@shikijs/transformers"])
  delete initialPackage.dependencies[name];
if (packageManager === "pnpm" && process.env.HONO_MARKDOWN_PACKAGE) {
  await writeFile(
    join(app, "pnpm-workspace.yaml"),
    `overrides:\n  '@ts-76/hono-markdown': ${JSON.stringify(`file:${resolve(process.env.HONO_MARKDOWN_PACKAGE)}`)}\n`,
  );
}
await writeFile(join(app, "package.json"), JSON.stringify(initialPackage, null, 2) + "\n");
try {
  run(
    packageManager,
    packageManager === "pnpm"
      ? ["add", "--ignore-scripts", join(root, packed[0].filename)]
      : [
          "install",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          ...(process.env.HONO_MARKDOWN_PACKAGE ? [resolve(process.env.HONO_MARKDOWN_PACKAGE)] : []),
          join(root, packed[0].filename),
        ],
  );
} catch (error) {
  console.error(error.stdout, error.stderr);
  throw error;
}
const require = createRequire(join(app, "package.json"));
const deckPackage = JSON.parse(await readFile(join(app, "node_modules/hono-decks/package.json"), "utf8"));
const cli = join(app, "node_modules/hono-decks", deckPackage.bin["hono-decks"]);
const originalPackage = await readFile(join(app, "package.json"), "utf8");
assert.equal(await readFile(join(app, "node_modules/markdown-exit/package.json"), "utf8").catch(() => null), null);
console.log(run(process.execPath, [cli, "init", "--framework", "void", "--install", "--adapter", resolve(adapter)]));
const installedPackage = JSON.parse(await readFile(join(app, "package.json"), "utf8"));
assert.ok(installedPackage.dependencies["void-plugin-hono-jsx"]);
if (packageManager === "pnpm") {
  // The app declares only the host adapter; its isolated dependency is private.
  assert.equal(installedPackage.dependencies["@ts-76/hono-markdown"], undefined);
  assert.throws(() => require.resolve("@ts-76/hono-markdown"));
}
assert.ok(require.resolve("markdown-exit"));
const settingsPath = join(app, "deck-settings.ts");
await writeFile(settingsPath, 'export const mountPath = "/slides";\n');
const configPath = join(app, "hono-decks.config.ts");
await writeFile(
  configPath,
  'import { mountPath } from "./deck-settings";\n' +
    (await readFile(configPath, "utf8")).replace('mountPath: "/slides"', "mountPath"),
);
assert.deepEqual(installedPackage.scripts, JSON.parse(originalPackage).scripts);
assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
// Cold build uses virtual Markdown and MDX modules without a preceding compile.
console.log(run(packageManager, ["run", "typecheck"]));
console.log(run(packageManager, ["run", "build"]));
const compile = () => run(process.execPath, [cli, "compile"]);
const sourcePath = join(app, "decks/demo/deck.md");
const source = await readFile(sourcePath, "utf8");
async function generatedSnapshot(dir) {
  const files = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [file, text] of Object.entries(await generatedSnapshot(path))) files[`${entry.name}/${file}`] = text;
    } else files[entry.name] = await readFile(path, "utf8");
  }
  return files;
}
assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
compile(); // Separate compatibility check: the CLI still writes files.
const stableOutput = await generatedSnapshot(join(app, "src/generated"));
const clientDir = join(app, "decks/legacy/components/client");
await mkdir(clientDir, { recursive: true });
await writeFile(join(clientDir, "index.tsx"), "export const Counter = ;");
await writeFile(sourcePath, source.replace("Markdown でスライドを書く", "Must not be published"));
assert.throws(compile);
assert.deepEqual(await generatedSnapshot(join(app, "src/generated")), stableOutput);
await rm(join(clientDir, "index.tsx"));
await writeFile(sourcePath, source);
compile();
const lastGood = await readFile(join(app, "src/generated/decks.ts"), "utf8");
for (const invalid of [
  "<script>window.bad = true;</script>\n# Bad",
  '<script>import Counter from "./Callout.tsx" with { island: "unknown" };</script>\n<Counter />',
  "---\ntitle: One\ntitle: Two\n---\n# Bad",
]) {
  await writeFile(sourcePath, invalid);
  assert.throws(compile, /Void Markdown compile failed/);
  assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8"), lastGood);
}
await writeFile(sourcePath, source);
compile();
const generated = await readFile(join(app, "src/generated/decks.ts"), "utf8");
assert.match(generated, /Void Markdown Demo/);
assert.match(generated, /Legacy MDX/);
assert.match(generated, /発表者だけ/);
assert.match(await readFile(join(app, "src/generated/decks/demo/slide-0.ts"), "utf8"), /MarkdownContext.Provider/);
try {
  console.log(run(packageManager, ["run", "build"]));
  console.log(run(packageManager, ["run", "typecheck"]));
} catch (error) {
  console.error(error.stdout, error.stderr);
  throw error;
}

async function assertBuildGraph(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await assertBuildGraph(path);
    else if (entry.name.endsWith(".js.map")) {
      const map = JSON.parse(await readFile(path, "utf8"));
      assert.ok(
        !map.sources.some((source) =>
          /(?:@mdx-js|remark-|markdown-exit|@shikijs|shiki\/|hono-pages\/src\/plugins|void-plugin-hono-jsx\/dist\/plugins)/.test(
            source,
          ),
        ),
        `Compiler in runtime graph: ${path}`,
      );
    }
  }
}
await assertBuildGraph(join(app, "dist"));

const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const evidence = {
  node: process.version,
  packageManager,
  commonDependencyIsolated: packageManager === "pnpm",
  root,
  failedBuildPreserved: true,
  compilerExcludedFromRuntime: true,
  initializedVoid: true,
  automaticDependencyInstall: true,
  packageScriptsUnchanged: true,
  coldBuildWithoutCompile: true,
  coldDevWithoutCompile: true,
  virtualModules: true,
  importedConfigMountChange: true,
  nonRootViteBase: "/dev-assets/",
  noGeneratedFilesDuringDev: true,
  modes: [],
};
async function check(mode, port) {
  if (mode === "dev") await rm(join(app, "src/generated"), { recursive: true, force: true });
  const server = spawn(
    packageManager,
    ["run", mode, ...(packageManager === "npm" ? ["--"] : []), "--port", String(port), "--strictPort"],
    {
      cwd: app,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  let log = "";
  server.stdout.on("data", (chunk) => {
    log += chunk;
  });
  server.stderr.on("data", (chunk) => {
    log += chunk;
  });
  const origin = `http://127.0.0.1:${port}`;
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    let ready = false;
    for (let i = 0; i < 160; i++) {
      if (server.exitCode !== null) throw new Error(log);
      try {
        if ((await fetch(origin + "/slides")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, log);
    await page.goto(origin + "/slides/welcome/render");
    assert.match(await page.textContent("body"), /Edit decks\/welcome\/deck.md/);
    await page.keyboard.press("ArrowRight");
    await page.locator('[data-hono-md-mounted="true"] button').waitFor();
    const sampleCounter = page.getByRole("button", { name: "Count: 0", exact: true });
    await sampleCounter.waitFor();
    await sampleCounter.click();
    await page.getByRole("button", { name: "Count: 1", exact: true }).waitFor();
    assert.equal((await fetch(origin + "/outside-slides")).status, 404);
    for (const suffix of ["/render", "/print", "/presenter"]) {
      const response = await fetch(origin + "/slides/demo" + suffix);
      assert.equal(response.status, 200, suffix);
      const html = await response.text();
      assert.match(html, /Markdown/);
    }
    await page.goto(origin + "/slides/demo/render");
    assert.equal(await page.locator("section[data-slide-index]").count(), 2);
    assert.equal(await page.locator(".demo-callout").getAttribute("data-context-title"), "Void Markdown Demo");
    assert.match(await page.locator(".demo-callout strong").last().textContent(), /TSX/);
    assert.equal(await page.locator(".shiki").count(), 1);
    assert.equal(await page.locator(".custom-block.tip").count(), 1);
    assert.equal((await fetch(origin + "/slides/demo/assets/logo.svg")).status, 200);
    await page.keyboard.press("ArrowRight");
    await page.locator('section[data-slide-index="1"][data-slide-state="active"]').waitFor();
    const copy = page.locator("button.copy");
    await copy.scrollIntoViewIfNeeded();
    await copy.click();
    await page.waitForFunction(() => document.querySelector("button.copy")?.classList.contains("copied"));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'const message = "Hono Markdown";');
    if (mode === "dev") {
      assert.equal(
        await page.locator('script[src$="@vite/client"]').first().getAttribute("src"),
        "/dev-assets/@vite/client",
      );
      assert.equal((await fetch(origin + "/dev-assets/@vite/client")).status, 200);
      await writeFile(sourcePath, source.replace("Markdown でスライドを書く", "更新した Markdown スライド"));
      await page.waitForFunction(() => document.body.textContent?.includes("更新した Markdown スライド"), null, {
        timeout: 20000,
      });
      const transient = join(app, "decks/transient.md");
      await writeFile(transient, "# Added Markdown deck");
      await page.waitForFunction(async () => (await fetch("/slides/transient/render")).ok, null, { timeout: 20000 });
      await rm(transient);
      await page.waitForFunction(async () => (await fetch("/slides/transient/render")).status === 404, null, {
        timeout: 20000,
      });
      await writeFile(sourcePath, source);
      await page.waitForFunction(() => document.body.textContent?.includes("Markdown でスライドを書く"), null, {
        timeout: 20000,
      });
    }
    await page.waitForFunction(
      () => document.querySelector('section[data-slide-index="0"]')?.getAttribute("data-slide-state") === "inactive",
    );
    await page.screenshot({ path: join(root, `${mode}-desktop.png`) });
    await page.goto(origin + "/slides/legacy/render");
    assert.match(await page.textContent("body"), /Existing MDX still works/);
    for (const [slug, expected, other] of [
      ["collision-one", "Void collision body", "MDX collision body"],
      ["collision_one", "MDX collision body", "Void collision body"],
    ]) {
      await page.goto(origin + `/slides/${slug}/render`);
      const heading = await page.locator("h1").textContent();
      assert.equal(heading, expected);
      assert.ok(!heading.includes(other));
    }
    await page.goto(origin + "/slides/interactive/render");
    const first = page.locator('[data-md-counter="first"]');
    const second = page.locator('[data-md-counter="second"]');
    await page.locator('[data-hono-md-mounted="true"] [data-md-counter="first"]').waitFor();
    assert.equal(await first.getAttribute("data-context-title"), "Interactive Markdown");
    assert.equal(await first.getAttribute("data-context-heading"), "Interactive first slide");
    assert.equal(await first.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(12, 34, 56)");
    await first.click();
    assert.equal(await first.textContent(), "first: 3");
    assert.equal(await second.textContent(), "second: 7");
    await page.locator('[data-hono-md-mounted="true"] [data-md-counter="idle"]').waitFor();
    await page.locator('[data-hono-md-mounted="true"] [data-md-counter="media"]').waitFor();
    assert.equal(
      await page.locator('[data-md-counter="visible"]').evaluate((el) => el.parentElement.dataset.honoMdMounted),
      undefined,
    );
    await page.locator("h1").first().click();
    await page.keyboard.press("ArrowRight");
    await page.locator('section[data-slide-index="1"][data-slide-state="active"]').waitFor();
    const visible = page.locator('[data-hono-md-mounted="true"] [data-md-counter="visible"]');
    await visible.waitFor();
    await visible.click();
    assert.equal(await visible.textContent(), "visible: 5");
    assert.equal(await visible.getAttribute("data-context-title"), "Second interactive slide");
    const printHtml = await fetch(origin + "/slides/interactive/print").then((r) => r.text());
    assert.match(printHtml, /data-hono-md-island/);
    assert.match(printHtml, /md-counter/);
    const staticHtml = await fetch(origin + "/slides/collision-one/render").then((r) => r.text());
    assert.ok(!staticHtml.includes("/_assets/client.js"));
    await page.goto(origin + "/slides/interactive/print");
    assert.equal(
      await page.locator('[data-md-counter="first"]').evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(12, 34, 56)",
    );
    await page.goto(origin + "/slides/interactive/presenter");
    const presenterFrame = page.frameLocator("iframe").first();
    await presenterFrame.locator('[data-md-counter="first"]').waitFor();
    assert.equal(
      await presenterFrame.locator('[data-md-counter="first"]').getAttribute("data-context-title"),
      "Interactive Markdown",
    );
    await page.goto(origin + "/slides/interactive");
    const viewerFrame = page.frameLocator("iframe").first();
    const viewerCounter = viewerFrame.locator('[data-hono-md-mounted="true"] [data-md-counter="first"]');
    await viewerCounter.waitFor();
    await viewerCounter.click();
    assert.equal(await viewerCounter.textContent(), "first: 3");
    await page.goto(origin + "/slides/another/render");
    const another = page.locator('[data-hono-md-mounted="true"] [data-md-counter="another"]');
    await another.waitFor();
    assert.equal(await another.getAttribute("data-context-title"), "Another deck context");
    await another.click();
    assert.equal(await another.textContent(), "another: 11");
    await page.goto(origin + "/slides/interactive/render");
    if (mode === "dev") {
      const counterFile = join(app, "decks/interactive/Counter.tsx");
      const counterSource = await readFile(counterFile, "utf8");
      await writeFile(counterFile, counterSource.replace("{label}: {count}", "Updated {label}: {count}"));
      await page.waitForFunction(() => document.body.textContent?.includes("Updated first: 2"), null, {
        timeout: 20000,
      });
      await writeFile(counterFile, counterSource);
      await page.waitForFunction(
        () => document.body.textContent?.includes("first: 2") && !document.body.textContent?.includes("Updated first"),
        null,
        { timeout: 20000 },
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/slides/interactive/render");
    await page.locator('[data-hono-md-mounted="true"] [data-md-counter="first"]').waitFor();
    assert.equal(
      await page.locator('[data-md-counter="media"]').evaluate((el) => el.parentElement.dataset.honoMdMounted),
      undefined,
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-hono-md-mounted="true"] [data-md-counter="media"]').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/slides/demo");
    assert.equal((await page.locator("iframe").count()) > 0, true);
    const frame = page.frameLocator("iframe").first();
    await frame.locator('section[data-slide-index="0"][data-slide-state="active"]').waitFor();
    await page.screenshot({ path: join(root, `${mode}-mobile.png`) });
    if (mode === "dev") {
      for (const [mount, oldMount] of [
        ["/talks/archive", "/slides"],
        ["/slides", "/talks/archive"],
      ]) {
        const restartOffset = log.length;
        await writeFile(settingsPath, `export const mountPath = ${JSON.stringify(mount)};\n`);
        for (let attempt = 0; attempt < 200 && !log.slice(restartOffset).includes("server restarted"); attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(log.slice(restartOffset).includes("server restarted"), log);
        assert.equal((await fetch(origin + oldMount + "/demo/render")).status, 404);
        const response = await fetch(origin + mount + "/demo/render");
        assert.equal(response.status, 200);
        assert.match(await response.text(), new RegExp(mount + "/demo/assets/logo.svg"));
        await page.goto(origin + mount + "/legacy/render");
        assert.match(await page.textContent("body"), /Existing MDX still works/);
      }
    }
    assert.deepEqual(errors, []);
    assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
    evidence.modes.push({
      mode,
      surfaces: ["viewer", "render", "print", "presenter"],
      slides: 2,
      copy: true,
      context: true,
      legacyMdx: true,
      distinctMixedFormatSlugs: true,
      markdownIslands: ["load", "visible", "idle", "media"],
      islandCssAndContext: true,
      ...(mode === "dev" ? { hmr: ["edit", "add", "remove"] } : {}),
    });
  } catch (error) {
    await writeFile(
      join(root, `${mode}-failure.json`),
      JSON.stringify(
        {
          error: String(error),
          errors,
          buttons: await page
            .locator("[data-md-counter]")
            .allTextContents()
            .catch(() => []),
          url: page.url(),
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await writeFile(join(root, `${mode}-server.log`), log);
    await context.close();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
  }
}
try {
  await check("dev", 5293);
  await check("preview", 5294);
} finally {
  await browser.close();
}
await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
