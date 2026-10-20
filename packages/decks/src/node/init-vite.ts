import { parse } from "@babel/parser";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { publishGeneratedFiles } from "./file-transaction";

import { installVoidDependencies, type VoidInstallOptions } from "./install-void";

import { vitePresets } from "../adapters/vite-presets";

export type InitFramework = "void" | "hono" | "honox";

/** Configure an existing Vite app without changing its package scripts. */
export async function initializeVite(
  cwd: string,
  framework: InitFramework,
  configFile = "hono-decks.config.ts",
  entry?: string,
  installation?: VoidInstallOptions,
): Promise<string> {
  if (
    !configFile ||
    configFile.startsWith("/") ||
    configFile.includes("\\") ||
    /^[A-Za-z]:/.test(configFile) ||
    configFile.split("/").includes("..") ||
    !/\.[cm]?[jt]s$/.test(configFile)
  ) {
    throw new Error("--config must be a JS/TS file inside the current working directory.");
  }
  const require = createRequire(join(cwd, "package.json"));
  const dependencies = vitePresets[framework].dependencies;
  for (const dependency of installation ? [] : dependencies) {
    try {
      require.resolve(dependency);
    } catch {
      throw new Error(
        `${framework} init requires ${dependency}. Install the compatible dependencies first; no files were changed.`,
      );
    }
  }
  const candidates = ["ts", "mts", "js", "mjs", "cts", "cjs"]
    .map((ext) => `vite.config.${ext}`)
    .filter((file) => existsSync(join(cwd, file)));
  if (candidates.length !== 1) {
    throw new Error(
      "Expected one existing vite.config.{ts,mts,js,mjs,cts,cjs} in the app root. No files were changed.",
    );
  }
  const viteFile = candidates[0]!;
  const source = await readFile(join(cwd, viteFile), "utf8");
  const patched = connectViteConfig(source, configFile);
  let sampleSlug = "welcome";
  let suffix = 2;
  while ([sampleSlug, `${sampleSlug}.md`, `${sampleSlug}.mdx`].some((path) => existsSync(join(cwd, "decks", path)))) {
    sampleSlug = `welcome-${suffix++}`;
  }
  const files = [
    {
      path: configFile,
      content: `import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/slides",
  build: { root: "decks"${framework === "void" ? ', markdown: "void"' : ""} },${vitePresets[framework].clientEntryAssetPath ? `\n  router: { clientEntryAssetPath: ${JSON.stringify(vitePresets[framework].clientEntryAssetPath)} },` : ""}
});
`,
    },
    {
      path: "src/decks.ts",
      content: `/// <reference types="hono-decks/vite-env" />
/// <reference types="vite/client" />
import { decks } from "virtual:hono-decks";

export { decks };
`,
    },
    {
      path: "middleware/hono-decks.ts",
      content: `import { Hono } from "hono";
import { raw } from "hono/html";
import { defineMiddleware } from "void";
import markdownStyle from "void-plugin-hono-jsx/theme-content.css?inline";
import { decks } from "../src/decks";

const app = new Hono();
const devClient = import.meta.env.DEV ? '<script type="module" src="' + import.meta.env.BASE_URL + '@vite/client"></script>' : "";
app.route(decks.mountPath, decks.router({
  document: { head: raw(\`<style>\${markdownStyle}</style>\${devClient}\`) },
}));

export default defineMiddleware(async (c, next) => {
  const mount = decks.mountPath.replace(/\\/$/, "");
  if (c.req.path === mount || c.req.path.startsWith(mount + "/")) {
    return app.fetch(c.req.raw, c.env, c.executionCtx);
  }
  await next();
});
`,
    },
    {
      path: `decks/${sampleSlug}/deck.${framework === "void" ? "md" : "mdx"}`,
      content: `${framework === "void" ? '<script>\nimport Counter from "./Counter.tsx" with { island: "load" };\n</script>\n' : ""}---
title: Welcome
---
# Welcome

Edit decks/${sampleSlug}/deck.${framework === "void" ? "md" : "mdx"} to write your slides.

---

# Next slide

Existing .mdx decks work alongside Hono Markdown.
${framework === "void" ? "\n<Counter />\n" : ""}
`,
    },
  ];
  if (framework === "void")
    files.push({
      path: `decks/${sampleSlug}/Counter.tsx`,
      content: `import { useState } from "hono/jsx";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button type="button" onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
`,
    });
  const edits: { path: string; content: string }[] = [];
  if (framework !== "void") {
    files.splice(2, 1);
    files[1]!.content =
      files[1]!.content +
      `
import { raw } from "hono/html";

export const deckRouter = decks.router({
  document: { head: raw(import.meta.env.DEV ? '<script type="module" src="' + import.meta.env.BASE_URL + '@vite/client"></script>' : "") },
});
`;
    if (framework === "hono") {
      const entryFile = selectHonoEntry(cwd, entry);
      const appSource = await readFile(join(cwd, entryFile), "utf8");
      edits.push({ path: entryFile, content: connectHonoApp(appSource, relativeModule(entryFile, "src/decks.ts")) });
    } else {
      if (!existsSync(join(cwd, "app/routes"))) {
        throw new Error(
          "HonoX init expects app/routes. Custom app directories require manual integration. No files were changed.",
        );
      }
      for (const path of [
        "app/routes/slides",
        "app/routes/slides.ts",
        "app/routes/slides.tsx",
        "app/routes/slides.jsx",
        "app/routes/slides.js",
      ]) {
        if (existsSync(join(cwd, path))) throw new Error(`Refusing to replace existing HonoX route: ${path}`);
      }
      const serverFile = "app/server.ts";
      const appSource = await readFile(join(cwd, serverFile), "utf8");
      edits.push({ path: serverFile, content: connectHonoXApp(appSource) });
      files.push({ path: "src/honox-decks.ts", content: emitHonoXIntegration() });
    }
  }
  for (const file of files) {
    if (existsSync(join(cwd, file.path))) throw new Error(`Refusing to overwrite existing file: ${file.path}`);
  }
  if (new Set(files.map((file) => file.path)).size !== files.length || files.some((file) => file.path === viteFile)) {
    throw new Error("--config conflicts with an integration file. No files were changed.");
  }
  if (installation) {
    if (framework !== "void") throw new Error("--install is supported for Void only.");
    await installVoidDependencies(cwd, installation);
  }
  await publishGeneratedFiles([
    ...[...files, ...edits].map((file) => ({ ...file, path: join(cwd, file.path) })),
    { path: join(cwd, viteFile), content: patched },
  ]);
  return sampleSlug;
}

function emitHonoXIntegration(): string {
  return `/// <reference types="vite/client" />
import type { Env } from "hono";
import type { ServerOptions } from "honox/server";
import { withHonoXDecks as connectHonoXDecks } from "hono-decks/honox";
import { decks, deckRouter } from "./decks";

// Same route discovery convention as HonoX. Keep this outside app/routes to
// avoid importing the integration itself through the route glob.
const fileRoutes = import.meta.glob([
  "/app/routes/**/*.{ts,tsx,md,mdx}",
  "/app/routes/.well-known/**/*.{ts,tsx,md,mdx}",
  "!/app/routes/**/_*.{ts,tsx,md,mdx}",
  "!/app/routes/**/-*.{ts,tsx,md,mdx}",
  "!/app/routes/**/$*.{ts,tsx,md,mdx}",
  "!/app/routes/**/*.test.{ts,tsx}",
  "!/app/routes/**/*.spec.{ts,tsx}",
  "!/app/routes/**/-*/**/*",
], { eager: true }) as NonNullable<ServerOptions["ROUTES"]>;

export function withHonoXDecks<E extends Env>(options: ServerOptions<E> = {}): ServerOptions<E> {
  return connectHonoXDecks(options, { routes: fileRoutes, mountPath: decks.mountPath, router: deckRouter });
}
`;
}

/** Preserve createApp options while adding a config-driven route to HonoX. */
export function connectHonoXApp(source: string): string {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const unsupported = () =>
    new Error(
      "Cannot safely connect this HonoX server. Wrap createApp options with withHonoXDecks from src/honox-decks. No files were changed.",
    );
  if (ast.program.interpreter) throw unsupported();
  const constructors = ast.program.body.flatMap((node) =>
    node.type === "ImportDeclaration" && node.source.value === "honox/server"
      ? node.specifiers.flatMap((item) =>
          item.type === "ImportSpecifier" && item.imported.type === "Identifier" && item.imported.name === "createApp"
            ? [item.local.name]
            : [],
        )
      : [],
  );
  const exported = ast.program.body.find((node) => node.type === "ExportDefaultDeclaration");
  if (
    !exported ||
    exported.type !== "ExportDefaultDeclaration" ||
    exported.declaration.type !== "CallExpression" ||
    exported.declaration.callee.type !== "Identifier" ||
    !constructors.includes(exported.declaration.callee.name) ||
    exported.declaration.arguments.length > 1
  )
    throw unsupported();
  const call = exported.declaration;
  const arg = call.arguments[0];
  if (arg?.type === "SpreadElement" || call.end == null || call.callee.end == null) throw unsupported();
  let alias = "withHonoXDecks";
  while (source.includes(alias)) alias = "_" + alias;
  const start = arg?.start ?? call.end - 1;
  const end = arg?.end ?? start;
  if (start == null || end == null) throw unsupported();
  return (
    `import { withHonoXDecks as ${alias} } from "../src/honox-decks";\n` +
    source.slice(0, start) +
    alias +
    "(" +
    source.slice(start, end) +
    ")" +
    source.slice(end)
  );
}

/** Wrap only the default export expression, preserving app settings and comments. */
export function connectViteConfig(source: string, configFile: string): string {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  if (ast.program.interpreter)
    throw new Error("Vite config with a shebang requires manual integration. No files were changed.");
  if (ast.program.body.some((node) => node.type === "ImportDeclaration" && node.source.value === "hono-decks/vite")) {
    throw new Error(
      "Vite config already imports hono-decks/vite. Keep one honoDecks() registration; no files were changed.",
    );
  }
  const exported = ast.program.body.find((node) => node.type === "ExportDefaultDeclaration");
  if (
    !exported ||
    exported.type !== "ExportDefaultDeclaration" ||
    exported.declaration.start == null ||
    exported.declaration.end == null ||
    exported.declaration.type === "FunctionDeclaration" ||
    exported.declaration.type === "ClassDeclaration"
  ) {
    throw new Error(
      "Cannot safely wrap this Vite config. Add honoDecks() from hono-decks/vite to its plugins. No files were changed.",
    );
  }
  let alias = "withHonoDecks";
  while (source.includes(alias)) alias = "_" + alias;
  const options = configFile === "hono-decks.config.ts" ? "" : `, { configFile: ${JSON.stringify(configFile)} }`;
  const { start, end } = exported.declaration;
  return (
    `import { withHonoDecks as ${alias} } from "hono-decks/vite";\n` +
    source.slice(0, start) +
    `${alias}(` +
    source.slice(start, end) +
    options +
    ")" +
    source.slice(end)
  );
}

function selectHonoEntry(cwd: string, entry?: string): string {
  if (entry) {
    if (
      entry.startsWith("/") ||
      entry.includes("\\") ||
      /^[A-Za-z]:/.test(entry) ||
      entry.split("/").includes("..") ||
      !/\.[cm]?[jt]sx?$/.test(entry)
    ) {
      throw new Error("--entry must be a JS/TS file inside the current working directory.");
    }
    return entry;
  }
  const candidates = [
    "src/index.ts",
    "src/index.tsx",
    "src/index.js",
    "src/index.mts",
    "src/index.mjs",
    "src/app.ts",
    "src/app.tsx",
    "src/app.js",
  ].filter((path) => existsSync(join(cwd, path)));
  if (candidates.length !== 1) {
    throw new Error(
      "Cannot identify one Hono entry. Use --framework hono --entry path/to/app.ts. No files were changed.",
    );
  }
  return candidates[0]!;
}

function relativeModule(from: string, to: string): string {
  const parent = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : ".";
  const path = relative(parent, to)
    .replaceAll("\\", "/")
    .replace(/\.[cm]?[jt]sx?$/, "");
  return path.startsWith(".") ? path : "./" + path;
}

/** Append after app middleware; refuse earlier routes that could consume /slides. */
export function connectHonoApp(source: string, facadeImport: string): string {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const unsupported = () =>
    new Error(
      "Cannot safely connect this Hono entry. Export a const app = new Hono(), or mount decks.router() manually before conflicting routes. No files were changed.",
    );
  if (ast.program.interpreter) throw unsupported();
  const exported = ast.program.body.find((node) => node.type === "ExportDefaultDeclaration");
  if (
    !exported ||
    exported.type !== "ExportDefaultDeclaration" ||
    exported.declaration.type !== "Identifier" ||
    exported.start == null
  )
    throw unsupported();
  const trailing = ast.program.body.slice(ast.program.body.indexOf(exported) + 1);
  if (
    trailing.some(
      (node) =>
        node.type !== "TSInterfaceDeclaration" &&
        node.type !== "TSTypeAliasDeclaration" &&
        !(node.type === "ExportNamedDeclaration" && node.exportKind === "type"),
    )
  )
    throw unsupported();
  const appName = exported.declaration.name;
  const constructors = ast.program.body.flatMap((node) =>
    node.type === "ImportDeclaration" && node.source.value === "hono"
      ? node.specifiers.flatMap((item) =>
          item.type === "ImportSpecifier" && item.imported.type === "Identifier" && item.imported.name === "Hono"
            ? [item.local.name]
            : [],
        )
      : [],
  );
  const declaration = ast.program.body.find(
    (node) =>
      node.type === "VariableDeclaration" &&
      node.kind === "const" &&
      node.declarations.some(
        (item) =>
          item.id.type === "Identifier" &&
          item.id.name === appName &&
          item.init?.type === "NewExpression" &&
          item.init.callee.type === "Identifier" &&
          constructors.includes(item.init.callee.name),
      ),
  );
  if (!declaration || declaration.end == null || declaration.end > exported.start) throw unsupported();

  function checkRoutes(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "CallExpression") {
      const call = value as {
        callee: { type: string; object?: unknown; property?: { name?: string } };
        arguments: { type: string; value?: string }[];
      };
      if (call.callee.type === "MemberExpression") {
        let receiver = call.callee.object as Record<string, unknown> | undefined;
        while (receiver?.type === "CallExpression")
          receiver = (receiver.callee as { object?: Record<string, unknown> }).object;
        const property = call.callee.property as { name?: string; value?: unknown } | undefined;
        const method = property?.name ?? (typeof property?.value === "string" ? property.value : undefined);
        if (
          receiver?.type === "Identifier" &&
          receiver.name === appName &&
          method &&
          ["get", "post", "put", "patch", "delete", "options", "head", "all", "on", "route"].includes(method)
        ) {
          const path = call.arguments[method === "on" ? 1 : 0];
          if (
            !path ||
            path.type !== "StringLiteral" ||
            !path.value ||
            path.value.includes(":") ||
            path.value.includes("{") ||
            path.value === "*" ||
            path.value === "/*" ||
            (method === "route" && path.value === "/") ||
            path.value.startsWith("/slides") ||
            (path.value.includes("*") && "/slides/".startsWith(path.value.split("*")[0]!))
          )
            throw unsupported();
        }
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(checkRoutes);
      else if (child && typeof child === "object") checkRoutes(child);
    }
  }
  checkRoutes(ast.program);
  let alias = "_honoDecks";
  while (source.includes(alias)) alias = "_" + alias;
  const routerAlias = alias + "Router";
  return (
    `import { decks as ${alias}, deckRouter as ${routerAlias} } from ${JSON.stringify(facadeImport)};\n` +
    source.slice(0, exported.start) +
    `${appName}.route(${alias}.mountPath, ${routerAlias});\n\n` +
    source.slice(exported.start)
  );
}
