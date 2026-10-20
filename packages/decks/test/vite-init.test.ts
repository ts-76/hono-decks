import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { runHonoDecksCli } from "../src/node/cli";
import { withHonoXDecks } from "../src/honox";
import { Hono } from "hono";
import { connectHonoApp, connectHonoXApp } from "../src/node/init-vite";

describe("Hono and HonoX init", () => {
  it("connects a Hono app after its middleware without changing routes or scripts", async () => {
    const cwd = await fixture("hono");
    try {
      const pkg = await readFile(join(cwd, "package.json"), "utf8");
      const original = await readFile(join(cwd, "server.ts"), "utf8");
      expect(
        (await runHonoDecksCli({ cwd, argv: ["init", "--framework", "hono", "--entry", "server.ts"] })).exitCode,
      ).toBe(0);
      expect(await readFile(join(cwd, "package.json"), "utf8")).toBe(pkg);
      const source = await readFile(join(cwd, "server.ts"), "utf8");
      expect(source).toContain('from "./src/decks"');
      expect(source.indexOf("app.use(")).toBeLessThan(source.indexOf("app.route("));
      expect(source).toContain(original.replace("export default app;", ""));
      const config = await readFile(join(cwd, "hono-decks.config.ts"), "utf8");
      expect(config).not.toContain('markdown: "void"');
      expect(config).toContain('clientEntryAssetPath: "/_assets/client"');
      expect(await readFile(join(cwd, "decks/welcome/deck.mdx"), "utf8")).toContain("# Welcome");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("connects HonoX through config-driven routes while retaining server options and middleware", async () => {
    const cwd = await fixture("honox");
    try {
      await mkdir(join(cwd, "app/routes"), { recursive: true });
      await writeFile(join(cwd, "app/routes/_middleware.ts"), "// app auth");
      const server =
        'import { createApp } from "honox/server";\nexport default createApp({ init(app) { app.get("/health", (c) => c.text("existing")); } });\n';
      await writeFile(join(cwd, "app/server.ts"), server);
      expect((await runHonoDecksCli({ cwd, argv: ["init", "--framework", "honox"] })).exitCode).toBe(0);
      expect(await readFile(join(cwd, "app/routes/slides/index.ts"), "utf8").catch(() => null)).toBe(null);
      expect(await readFile(join(cwd, "src/honox-decks.ts"), "utf8")).toContain("mountPath: decks.mountPath");
      expect(await readFile(join(cwd, "app/server.ts"), "utf8")).toContain(
        'createApp(withHonoXDecks({ init(app) { app.get("/health", (c) => c.text("existing")); } }))',
      );
      expect(await readFile(join(cwd, "app/routes/_middleware.ts"), "utf8")).toBe("// app auth");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects dynamic HonoX routes that can consume the configured mount", async () => {
    const cwd = await fixture("honox");
    try {
      await mkdir(join(cwd, "app/routes"), { recursive: true });
      await writeFile(
        join(cwd, "app/server.ts"),
        'import { createApp } from "honox/server"; export default createApp();',
      );
      expect((await runHonoDecksCli({ cwd, argv: ["init", "--framework", "honox"] })).exitCode).toBe(0);
      const source = await readFile(join(cwd, "src/honox-decks.ts"), "utf8");
      expect(source).toContain('from "hono-decks/honox"');
      const connect = (options: { ROUTES: Record<string, object> }) =>
        withHonoXDecks(options, {
          routes: {},
          mountPath: "/slides",
          router: new Hono(),
        });
      for (const path of ["[...path].tsx", "[slug].tsx", "(group)/[...path].tsx", "[slug]/child.tsx"]) {
        expect(() => connect({ ROUTES: { ["/app/routes/" + path]: { default() {} } } })).toThrow("conflicts");
      }
      expect(() => connect({ ROUTES: { "/app/routes/api/[...path].tsx": { default() {} } } })).not.toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("wraps HonoX createApp aliases, generic calls, and comments without dropping options", () => {
    for (const expression of ["createApp()", "createApp<Env>(/* keep */)", "createApp(options)"]) {
      const transformed = connectHonoXApp(
        'import { createApp } from "honox/server";\nexport default ' + expression + ";",
      );
      expect(transformed).toContain("withHonoXDecks(");
      if (expression.includes("keep")) expect(transformed).toContain("/* keep */");
      if (expression.includes("options")) expect(transformed).toContain("withHonoXDecks(options)");
    }
    expect(
      connectHonoXApp('import { createApp as makeApp } from "honox/server"; export default makeApp({});'),
    ).toContain("makeApp(withHonoXDecks({}))");
    expect(() => connectHonoXApp("export default unknownApp();")).toThrow("No files were changed");
  });

  it("refuses catch-all or dynamic Hono routes instead of bypassing them", () => {
    for (const route of [
      'app.get("*", handler);',
      'app.route("/", other);',
      'app.get("/:slug", handler);',
      "app.get(path, handler);",
    ]) {
      expect(() =>
        connectHonoApp(`import { Hono } from "hono"; const app = new Hono(); ${route} export default app;`, "./decks"),
      ).toThrow("No files were changed");
    }
    expect(() => connectHonoApp("export default new Hono();", "./decks")).toThrow();
    expect(() =>
      connectHonoApp(
        'import { Hono } from "hono"; const app = new Hono(); export default app; app.use("*", auth);',
        "./decks",
      ),
    ).toThrow();
    expect(() =>
      connectHonoApp(
        'import { Hono } from "hono"; const app = new Hono(); app["get"]("*", handler); export default app;',
        "./decks",
      ),
    ).toThrow();
  });

  it("supports constructor aliases and refuses route collisions before writing config", async () => {
    expect(
      connectHonoApp(
        'import { Hono as WebApp } from "hono"; const app = new WebApp(); app.get("/api/*", handler); export default app;',
        "./decks",
      ),
    ).toContain("app.route(");
    const cwd = await fixture("hono");
    try {
      await writeFile(
        join(cwd, "server.ts"),
        'import { Hono } from "hono"; const app = new Hono(); app.get("/*", handler); export default app;',
      );
      const before = await readFile(join(cwd, "vite.config.ts"), "utf8");
      expect(
        (await runHonoDecksCli({ cwd, argv: ["init", "--framework", "hono", "--entry", "server.ts"] })).exitCode,
      ).toBe(1);
      expect(await readFile(join(cwd, "vite.config.ts"), "utf8")).toBe(before);
      expect((await readdir(cwd, { withFileTypes: true })).map((file) => file.name).sort()).toEqual([
        "node_modules",
        "package.json",
        "server.ts",
        "vite.config.ts",
      ]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("does not replace an existing HonoX slides route", async () => {
    const cwd = await fixture("honox");
    try {
      await mkdir(join(cwd, "app/routes"), { recursive: true });
      await writeFile(join(cwd, "app/routes/slides.tsx"), "// existing route");
      expect((await runHonoDecksCli({ cwd, argv: ["init", "--framework", "honox"] })).exitCode).toBe(1);
      expect(await readFile(join(cwd, "app/routes/slides.tsx"), "utf8")).toBe("// existing route");
      expect(await readFile(join(cwd, "hono-decks.config.ts"), "utf8").catch(() => null)).toBe(null);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

async function fixture(framework: "hono" | "honox"): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-decks-vite-init-"));
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ type: "module", scripts: { dev: "vite", build: "vite build" } }),
  );
  await writeFile(join(cwd, "vite.config.ts"), "export default { plugins: [], build: { sourcemap: true } };");
  if (framework === "hono")
    await writeFile(
      join(cwd, "server.ts"),
      'import { Hono } from "hono";\nconst app = new Hono();\napp.use("*", async (_c, next) => { await next(); });\napp.get("/", (c) => c.text("existing"));\nexport default app;',
    );
  for (const name of ["hono", "vite", ...(framework === "honox" ? ["honox"] : [])]) {
    const dir = join(cwd, "node_modules", name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name, exports: "./index.js" }));
    await writeFile(join(dir, "index.js"), "export {};");
  }
  return cwd;
}
