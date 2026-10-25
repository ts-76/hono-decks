import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { runHonoDecksCli } from "../src/node/cli";
import { connectViteConfig } from "../src/node/init-vite";
import { withHonoDecks } from "../src/vite";

describe("Void init", () => {
  it("preserves async Vite config, environment, comments, and existing plugins", async () => {
    const source = `// export default is not code here
import { defineConfig } from "vite";
const withHonoDecks = "app-owned";
export default defineConfig(async ({ command }) => ({
  // Keep the app plugin and build settings.
  plugins: [voidPlugin()],
  base: command === "build" ? "/app/" : "/",
}));
`;
    const output = connectViteConfig(source, "config/slides.ts");
    expect(output).toContain("import { withHonoDecks as _withHonoDecks }");
    expect(output).toContain("export default _withHonoDecks(defineConfig(async");
    expect(output).toContain("// Keep the app plugin and build settings.");
    expect(output).toContain("plugins: [voidPlugin()]");
    expect(output).toContain(', { configFile: "config/slides.ts" })');
    const wrapped = withHonoDecks(async (env) => ({
      base: env.command === "build" ? "/app/" : "/",
      plugins: [{ name: "existing" }],
      build: { sourcemap: true },
    }));
    expect(typeof wrapped).toBe("function");
    if (typeof wrapped !== "function") throw new Error("Expected config function");
    const resolved = await wrapped({ command: "build", mode: "production" });
    expect(resolved.base).toBe("/app/");
    expect(resolved.build?.sourcemap).toBe(true);
    expect(resolved.plugins).toMatchObject([{ name: "existing" }, { name: "hono-decks" }]);
    const object = withHonoDecks(Promise.resolve({ base: "/promised/" }));
    if (typeof object !== "function") throw new Error("Expected config function");
    expect((await object({ command: "serve", mode: "development" })).base).toBe("/promised/");
  });

  it("rejects ambiguous or previously connected config without rewriting it", () => {
    for (const source of [
      "module.exports = { plugins: [] };",
      'import { honoDecks } from "hono-decks/vite"; export default { plugins: [honoDecks()] };',
      "export default function config() { return {}; }",
    ])
      expect(() => connectViteConfig(source, "hono-decks.config.ts")).toThrow(
        /No files were changed|no files were changed/,
      );
  });

  it("creates the integration, leaves scripts intact, and refuses repeated init atomically", async () => {
    const cwd = await fixture();
    try {
      const initial = await readFile(join(cwd, "package.json"), "utf8");
      await writeFile(join(cwd, ".gitignore"), "# app ignores\nnode_modules/");
      const errors: string[] = [];
      const input = {
        cwd,
        argv: ["init", "--framework", "void", "--config", "config/slides.ts"],
        stderr: (line: string) => errors.push(line),
      };
      expect((await runHonoDecksCli(input)).exitCode, errors.join("\n")).toBe(0);
      expect(await readFile(join(cwd, "package.json"), "utf8")).toBe(initial);
      expect(await readFile(join(cwd, ".gitignore"), "utf8")).toBe("# app ignores\nnode_modules/");
      expect(await readFile(join(cwd, "src/decks.ts"), "utf8")).toContain('"virtual:hono-decks"');
      expect(await readFile(join(cwd, "config/slides.ts"), "utf8")).toContain('markdown: "void"');
      expect(await readFile(join(cwd, "middleware/hono-decks.ts"), "utf8")).toContain("import.meta.env.BASE_URL");
      expect(await readFile(join(cwd, "middleware/hono-decks.ts"), "utf8")).toContain(
        'c.req.path.startsWith(mount + "/")',
      );
      expect(await readFile(join(cwd, "decks/welcome/deck.md"), "utf8")).toContain("# Welcome");
      const vite = await readFile(join(cwd, "vite.config.ts"), "utf8");
      expect((await runHonoDecksCli(input)).exitCode).toBe(1);
      expect(await readFile(join(cwd, "vite.config.ts"), "utf8")).toBe(vite);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("leaves all app files intact on output conflict or unsupported options", async () => {
    const cwd = await fixture();
    try {
      await mkdir(join(cwd, "middleware"));
      await writeFile(join(cwd, "middleware/hono-decks.ts"), "// app-owned");
      const before = await readFile(join(cwd, "vite.config.ts"), "utf8");
      for (const args of [
        ["--framework", "void"],
        ["--framework", "other"],
        ["--framework", "void", "--out", "custom.ts"],
        ["--framework", "void", "--config", "../outside.ts"],
      ])
        expect((await runHonoDecksCli({ cwd, argv: ["init", ...args] })).exitCode).toBe(1);
      expect(await readFile(join(cwd, "vite.config.ts"), "utf8")).toBe(before);
      expect(await readFile(join(cwd, "middleware/hono-decks.ts"), "utf8")).toBe("// app-owned");
      expect(
        await readdir(cwd, { withFileTypes: true }).then((files) => files.map((file) => file.name).sort()),
      ).toEqual(["middleware", "node_modules", "package.json", "vite.config.ts"]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("reports missing compiler dependencies before writing integration files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "hono-decks-init-missing-"));
    try {
      const errors: string[] = [];
      expect(
        (await runHonoDecksCli({ cwd, argv: ["init", "--framework", "void"], stderr: (line) => errors.push(line) }))
          .exitCode,
      ).toBe(1);
      expect(errors.join("\n")).toContain("Install the compatible dependencies first");
      expect(await readdir(cwd, { withFileTypes: true })).toEqual([]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("chooses a free sample slug when an existing MDX deck is named welcome", async () => {
    const cwd = await fixture();
    try {
      await mkdir(join(cwd, "decks"));
      await writeFile(join(cwd, "decks/welcome.mdx"), "# Existing MDX");
      await writeFile(join(cwd, "decks/welcome-2.md"), "# Existing Markdown");
      const output: string[] = [];
      expect(
        (await runHonoDecksCli({ cwd, argv: ["init", "--framework", "void"], stdout: (line) => output.push(line) }))
          .exitCode,
      ).toBe(0);
      expect(await readFile(join(cwd, "decks/welcome.mdx"), "utf8")).toBe("# Existing MDX");
      expect(await readFile(join(cwd, "decks/welcome-3/deck.md"), "utf8")).toContain("decks/welcome-3/deck.md");
      expect(output.join("\n")).toContain("/slides/welcome-3");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

async function fixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-decks-void-init-"));
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ type: "module", scripts: { dev: "vite", build: "vite build" } }),
  );
  await writeFile(
    join(cwd, "vite.config.ts"),
    'import { voidPlugin } from "void";\nexport default { plugins: [voidPlugin()], base: "/" };\n',
  );
  for (const name of ["void", "vite", "hono", "void-plugin-hono-jsx", "yaml", "shiki", "@shikijs/transformers"]) {
    const dir = join(cwd, "node_modules", name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name, exports: { ".": "./index.js", "./markdown/compiler": "./index.js" } }),
    );
    await writeFile(join(dir, "index.js"), "export {};");
  }
  return cwd;
}
