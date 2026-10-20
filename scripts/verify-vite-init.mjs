import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = await mkdtemp(join(tmpdir(), "hono-decks-vite-init-"));
const run = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    console.error(error.stdout, error.stderr);
    throw error;
  }
};
const packed = JSON.parse(
  run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], join(repo, "packages/decks")),
);
const evidence = { root, node: process.version, apps: [] };
console.log(`Consumers: ${root}`);

for (const [framework, devPort, productionPort] of [
  ["hono", 5394, 5395],
  ["honox", 5396, 5397],
]) {
  const app = join(root, framework);
  await cp(join(repo, `fixtures/${framework}-vite`), app, { recursive: true });
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(root, packed[0].filename)], app);
  const require = createRequire(join(app, "package.json"));
  assert.throws(() => require.resolve("void-plugin-hono-jsx"));
  const packageBefore = await readFile(join(app, "package.json"), "utf8");
  const viteBefore = await readFile(join(app, "vite.config.ts"), "utf8");
  const sourcePath = join(app, "decks/existing/deck.mdx");
  const source = await readFile(sourcePath, "utf8");
  const preservedPaths = framework === "honox" ? ["app/routes/index.tsx", "app/routes/_middleware.ts"] : [];
  const preserved = await Promise.all(preservedPaths.map((path) => readFile(join(app, path), "utf8")));
  const honoxServer = framework === "honox" ? await readFile(join(app, "app/server.ts"), "utf8") : null;
  const honoEntry = framework === "hono" ? await readFile(join(app, "src/index.ts"), "utf8") : null;
  const cli = join(app, "node_modules/hono-decks/dist/bin.js");
  console.log(run(process.execPath, [cli, "init", "--framework", framework], app));
  const settingsPath = join(app, "deck-settings.ts");
  await writeFile(settingsPath, 'export const mountPath = "/slides";\n');
  const configPath = join(app, "hono-decks.config.ts");
  await writeFile(
    configPath,
    'import { mountPath } from "./deck-settings";\n' +
      (await readFile(configPath, "utf8")).replace('mountPath: "/slides"', "mountPath"),
  );
  assert.equal(await readFile(join(app, "package.json"), "utf8"), packageBefore);
  assert.equal(await readFile(sourcePath, "utf8"), source);
  for (const [index, path] of preservedPaths.entries())
    assert.equal(await readFile(join(app, path), "utf8"), preserved[index]);
  const viteAfter = await readFile(join(app, "vite.config.ts"), "utf8");
  assert.ok(viteAfter.includes(viteBefore.slice(0, viteBefore.indexOf("export default"))));
  assert.ok(viteAfter.includes(viteBefore.slice(viteBefore.indexOf("defineConfig(async"), -2)));
  if (honoxServer) {
    const serverAfter = await readFile(join(app, "app/server.ts"), "utf8");
    assert.ok(
      serverAfter.includes(
        honoxServer.slice(honoxServer.indexOf("createApp(") + "createApp(".length, honoxServer.lastIndexOf(")")),
      ),
    );
    assert.equal(await readFile(join(app, "app/routes/slides/index.ts"), "utf8").catch(() => null), null);
  }
  if (honoEntry) {
    const entryAfter = await readFile(join(app, "src/index.ts"), "utf8");
    assert.ok(entryAfter.includes(honoEntry.slice(0, honoEntry.indexOf("export default"))));
    assert.ok(entryAfter.endsWith(honoEntry.slice(honoEntry.indexOf("export default"))));
  }
  assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
  const neutralMarkdown = Boolean(process.env.HONO_MARKDOWN_PACKAGE);
  if (neutralMarkdown) {
    run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        resolve(process.env.HONO_MARKDOWN_PACKAGE),
        "markdown-exit@1.3.0",
        "yaml@2.9.1",
        "markdown-it-container@4.0.0",
        "shiki@4.5.0",
        "@shikijs/transformers@4.5.0",
      ],
      app,
    );
    assert.throws(() => require.resolve("void"));
    assert.throws(() => require.resolve("void-plugin-hono-jsx/markdown/compiler"));
    await writeFile(
      configPath,
      (await readFile(configPath, "utf8")).replace(
        'root: "decks"',
        'root: "decks", markdown: { adapter: "hono-decks/adapters/hono-markdown" }',
      ),
    );
    await mkdir(join(app, "decks/markdown"), { recursive: true });
    await writeFile(
      join(app, "decks/markdown/deck.md"),
      '<script>import Counter from "./Counter.tsx" with { island: "load" };</script>\n---\ntitle: Independent Markdown\n---\n# Markdown without Void\n\n<Counter />',
    );
    await writeFile(
      join(app, "decks/markdown/Counter.tsx"),
      `import { useState } from "hono/jsx";
import { useFrontmatter } from "@ts-76/hono-markdown";
export default function Counter() {
  const [count,setCount]=useState(0);
  const {title}=useFrontmatter<{title:string}>();
  return <button data-neutral-counter data-title={title} onClick={()=>setCount(count+1)}>Count: {count}</button>;
}`,
    );
  }
  console.log(run("npm", ["run", "typecheck"], app));
  if (framework === "honox") {
    const catchAll = join(app, "app/routes/[...path].tsx");
    await writeFile(catchAll, 'export default () => new Response("existing catch-all");');
    let failure;
    run("npm", ["run", "build"], app);
    try {
      execFileSync(process.execPath, ["dist/index.js"], { cwd: app, timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure && String(failure.stderr).includes("conflicts with HonoX route"));
    await rm(catchAll);
  }
  console.log(run("npm", ["run", "build"], app));
  console.log(run("npm", ["run", "typecheck"], app));
  assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
  await assertRuntimeGraph(join(app, "dist"));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });
  const modes = [];
  let mountPath = "/slides";
  try {
    for (const [mode, port] of [
      ["dev", devPort],
      ["start", productionPort],
    ]) {
      if (mode === "start") {
        console.log(run("npm", ["run", "build"], app));
        console.log(run("npm", ["run", "typecheck"], app));
      }
      assert.equal(await readFile(join(app, "src/generated/decks.ts"), "utf8").catch(() => null), null);
      const server = spawn(
        "npm",
        ["run", mode, ...(mode === "dev" ? ["--", "--port", String(port), "--strictPort"] : [])],
        {
          cwd: app,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let log = "";
      server.stdout.on("data", (data) => {
        log += data;
      });
      server.stderr.on("data", (data) => {
        log += data;
      });
      const origin = `http://127.0.0.1:${port}`;
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        let ready = false;
        for (let attempt = 0; attempt < 160; attempt++) {
          if (server.exitCode !== null) throw new Error(log);
          try {
            if ((await fetch(origin + "/")).ok) {
              ready = true;
              break;
            }
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        assert.ok(ready, log);
        const home = await fetch(origin + "/");
        assert.match(await home.text(), /Existing Hono(X)? home/);
        assert.deepEqual(await fetch(origin + "/api/health").then((response) => response.json()), { existing: true });
        for (const path of [
          `${mountPath}`,
          `${mountPath}/welcome/render`,
          `${mountPath}/existing`,
          `${mountPath}/existing/render`,
          `${mountPath}/existing/print`,
          `${mountPath}/existing/presenter`,
        ]) {
          const response = await fetch(origin + path);
          assert.equal(response.status, 200, path);
          assert.equal(response.headers.get("X-App-Middleware"), "preserved", path);
        }
        assert.equal((await fetch(origin + `${mountPath}/existing/render?deny=1`)).status, 401);
        assert.equal((await fetch(origin + `${mountPath}/existing/assets/logo.svg`)).status, 200);
        if (mode === "start") {
          assert.equal((await fetch(origin + "/slides/existing/render")).status, 404);
        }
        await page.goto(origin + `${mountPath}/welcome/render`);
        assert.match(await page.textContent("body"), /Edit decks\/welcome\/deck.mdx/);
        await page.goto(origin + `${mountPath}/existing/render`);
        assert.equal(await page.locator("section[data-slide-index]").count(), 2);
        assert.equal(await page.locator("[data-existing-component]").textContent(), "Existing MDX component");
        await page.keyboard.press("ArrowRight");
        await page.locator('section[data-slide-index="1"][data-slide-state="active"]').waitFor();
        if (mode === "dev") {
          assert.match(
            await page.locator('script[src$="@vite/client"]').first().getAttribute("src"),
            /^\/dev-assets\/@vite\/client$/,
          );
          assert.equal((await fetch(origin + "/dev-assets/@vite/client")).status, 200);
          await writeFile(sourcePath, source.replace("Existing MDX still works", "Updated existing MDX"));
          await page.waitForFunction(() => document.body.textContent?.includes("Updated existing MDX"), null, {
            timeout: 20000,
          });
          const added = join(app, "decks/added.mdx");
          await writeFile(added, "# Added MDX deck");
          await page.waitForFunction(async (mount) => (await fetch(mount + "/added/render")).ok, mountPath, {
            timeout: 20000,
          });
          await rm(added);
          await page.waitForFunction(
            async (mount) => (await fetch(mount + "/added/render")).status === 404,
            mountPath,
            {
              timeout: 20000,
            },
          );
          await writeFile(sourcePath, source);
          await page.waitForFunction(() => document.body.textContent?.includes("Existing MDX still works"), null, {
            timeout: 20000,
          });
        }
        if (mode === "dev") {
          const restartOffset = log.length;
          mountPath = "/talks/archive";
          await writeFile(settingsPath, 'export const mountPath = "/talks/archive";\n');
          for (let attempt = 0; attempt < 200 && !log.slice(restartOffset).includes("server restarted"); attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.ok(log.slice(restartOffset).includes("server restarted"), log);
          await page.waitForFunction(
            async (mount) => {
              const response = await fetch(mount + "/existing/render");
              return (
                response.ok &&
                (await response.text()).includes(mount + "/existing/assets/logo.svg") &&
                (await fetch("/slides/existing/render")).status === 404
              );
            },
            mountPath,
            { timeout: 20000 },
          );
          assert.equal((await fetch(origin + "/slides/existing/render")).status, 404);
          assert.equal((await fetch(origin + "/slides/existing/assets/logo.svg")).status, 404);
          await page.goto(origin + mountPath + "/existing/render");
          assert.equal(await page.locator("[data-existing-component]").textContent(), "Existing MDX component");
          assert.equal((await fetch(origin + mountPath + "/existing/render?deny=1")).status, 401);
          assert.equal((await fetch(origin + mountPath + "/existing/assets/logo.svg")).status, 200);
          assert.equal((await fetch(origin + mountPath + "/existing/print")).status, 200);
          assert.equal((await fetch(origin + mountPath + "/existing/presenter")).status, 200);
        }
        if (neutralMarkdown) {
          await page.goto(origin + `${mountPath}/markdown/render`);
          const counter = page.locator('[data-hono-md-mounted="true"] [data-neutral-counter]');
          await counter.waitFor();
          assert.equal(await counter.getAttribute("data-title"), "Independent Markdown");
          const client = await fetch(origin + `${mountPath}/_assets/client`);
          assert.equal(client.status, 200);
          assert.equal(client.headers.get("X-App-Middleware"), "preserved");
          assert.equal((await fetch(origin + `${mountPath}/_assets/client?deny=1`)).status, 401);
          await counter.click();
          assert.equal(await counter.textContent(), "Count: 1");
        }
        await page.screenshot({ path: join(root, `${framework}-${mode}-desktop.png`) });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(origin + `${mountPath}/existing`);
        await page
          .frameLocator("iframe")
          .first()
          .locator('section[data-slide-index="0"][data-slide-state="active"]')
          .waitFor();
        await page.screenshot({ path: join(root, `${framework}-${mode}-mobile.png`) });
        assert.deepEqual(errors, []);
        assert.equal(await readdir(join(app, "src/generated")).catch(() => null), null);
        modes.push({
          mode,
          existingPages: true,
          appMiddleware: true,
          authorizationPreserved: true,
          existingMdx: true,
          neutralMarkdown,
          components: true,
          assets: true,
          sample: true,
          desktopAndMobile: true,
          ...(mode === "dev" ? { hmr: ["edit", "add", "remove"] } : {}),
        });
      } catch (error) {
        await writeFile(
          join(root, `${framework}-${mode}-failure.json`),
          JSON.stringify(
            {
              error: String(error),
              browser: await page.textContent("body").catch(String),
              fresh: await fetch(origin + "/slides/existing/render")
                .then((r) => r.text())
                .catch(String),
              errors,
            },
            null,
            2,
          ),
        );
        throw error;
      } finally {
        await writeFile(join(root, `${framework}-${mode}.log`), log);
        await context.close();
        if (server.pid) process.kill(-server.pid, "SIGTERM");
      }
    }
  } finally {
    await browser.close();
  }
  evidence.apps.push({
    framework,
    scriptsUnchanged: true,
    importedConfigMountChange: "/talks/archive",
    nonRootViteBase: "/dev-assets/",
    sharedHonoXHelper: framework === "honox",
    appSettingsPreserved: true,
    noVoidDependency: true,
    neutralMarkdown,
    virtualModules: true,
    noGeneratedFiles: true,
    coldBuildWithoutCompile: true,
    coldDevWithoutCompile: true,
    compilerExcludedFromRuntime: true,
    modes,
  });
}
await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));

async function assertRuntimeGraph(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) await assertRuntimeGraph(path);
    else if (file.name.endsWith(".js.map")) {
      const map = JSON.parse(await readFile(path, "utf8"));
      assert.ok(
        !map.sources.some((source) =>
          /(?:@mdx-js|remark-|shiki\/|@babel\/parser|init-vite|compile-decks)/.test(
            source.split("/node_modules/").at(-1),
          ),
        ),
        path,
      );
    }
  }
}
