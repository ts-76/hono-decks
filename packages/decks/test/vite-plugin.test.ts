import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { build } from "vite";
import { honoDecks } from "../src/vite";

describe("honoDecks Vite plugin", () => {
  it("builds legacy .js imports without physical generated files", async () => {
    const cwd = await createFixture();
    try {
      await mkdir(join(cwd, "src"));
      await writeFile(join(cwd, "src/entry.ts"), 'export { createDecks } from "./generated/decks.js";');
      await build({
        configFile: false,
        root: cwd,
        logLevel: "silent",
        plugins: [honoDecks()],
        build: { ssr: "src/entry.ts", write: false, rollupOptions: { external: [/^hono(?:-decks)?(?:\/|$)/] } },
      });
      expect(await readFile(join(cwd, "src/generated/decks.ts"), "utf8").catch(() => null)).toBe(null);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("does not inject live reload into build modules", async () => {
    const cwd = await createFixture();
    try {
      const plugin = honoDecks();
      await (plugin.configResolved as Function)({ root: cwd, command: "build", base: "/", logger: { info() {}, error() {} } });
      const code = await (plugin.load as Function)("\0hono-decks:module:" + join(cwd, "src/generated/decks.ts"));
      expect(code).not.toContain("/@hono-decks/events");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("recompiles transitive config dependencies and replaces the watched dependency graph", async () => {
    const cwd = await createFixture();
    const plugin = honoDecks();
    const watcher = new FakeWatcher();
    const httpServer = new FakeHttpServer();
    let restarts = 0;
    let compilations = 0;
    try {
      await writeFile(join(cwd, "settings.ts"), 'export { mountPath } from "./paths";');
      await writeFile(join(cwd, "paths.ts"), 'export const mountPath = "/decks";');
      await writeFile(
        join(cwd, "hono-decks.config.ts"),
        'import { mountPath } from "./settings"; export default { mountPath };',
      );
      await (plugin.configResolved as Function)({ root: cwd, logger: { info: () => compilations++, error: () => {} } });
      (plugin.configureServer as Function)({
        watcher,
        httpServer,
        middlewares: { use() {} },
        environments: {},
        ws: { send() {} },
        restart: async () => {
          restarts++;
        },
      });
      expect(watcher.added).toContain(join(cwd, "paths.ts"));
      await writeFile(join(cwd, "paths.ts"), 'export const mountPath = "/talks";');
      watcher.emit("change", join(cwd, "paths.ts"));
      await waitFor(() => restarts === 1);
      expect(compilations).toBe(2);
      await writeFile(join(cwd, "alternate.ts"), 'export const mountPath = "/archive";');
      await writeFile(join(cwd, "settings.ts"), 'export { mountPath } from "./alternate";');
      watcher.emit("change", join(cwd, "settings.ts"));
      await waitFor(() => restarts === 2);
      expect(watcher.added).toContain(join(cwd, "alternate.ts"));
      expect(watcher.added).not.toContain(join(cwd, "paths.ts"));
      watcher.emit("change", join(cwd, "paths.ts"));
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(compilations).toBe(3);
    } finally {
      httpServer.close();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("compiles before Vite starts and recompiles deck changes through Vite's watcher", async () => {
    const cwd = await createFixture();
    const watcher = new FakeWatcher();
    const httpServer = new FakeHttpServer();
    const events: string[] = [];
    const ws = new FakeWebSocket(events);
    const environments = Object.fromEntries(
      ["client", "worker"].map((name) => [
        name,
        {
          name,
          moduleGraph: { invalidateAll: () => events.push(`${name}:invalidate`) },
          hot: { send: () => events.push(`${name}:reload`) },
        },
      ]),
    );
    const info: string[] = [];
    const errors: string[] = [];
    const plugin = honoDecks();
    const readModule = async (path: string): Promise<string> => {
      const load = plugin.load as Function;
      return (await load("\0hono-decks:module:" + join(cwd, path))) ?? "";
    };
    let restarts = 0;
    let middleware: Function = () => {};
    const writes: string[] = [];

    try {
      const configResolved = plugin.configResolved;
      expect(typeof configResolved).toBe("function");
      await (configResolved as Function)({
        root: cwd,
        command: "serve",
        base: "/",
        logger: {
          info: (message: string) => info.push(message),
          error: (message: string) => errors.push(message),
        },
      });

      expect(await readModule("src/generated/decks.ts")).toContain("/@hono-decks/events");
      const initial = await readModule("src/generated/decks/intro/slide-0.ts");
      expect(initial).toContain("Initial title");
      expect(await readFile(join(cwd, "src/generated/decks.ts"), "utf8").catch(() => null)).toBe(null);
      const resolveId = plugin.resolveId as Function;
      expect(await resolveId("virtual:hono-decks")).toBe("\0hono-decks:entry");
      expect(await resolveId("./generated/decks", join(cwd, "src/decks.ts"))).toBe(
        "\0hono-decks:module:" + join(cwd, "src/generated/decks.ts"),
      );
      expect(await (plugin.load as Function)("\0hono-decks:entry")).toContain(
        "export const decks = createDecks(config)",
      );
      expect(info.some((message) => message.includes("Compiled 1 decks"))).toBe(true);

      const configureServer = plugin.configureServer;
      expect(typeof configureServer).toBe("function");
      (configureServer as Function)({
        watcher,
        httpServer,
        middlewares: { use: (handler: Function) => { middleware = handler; } },
        ws,
        environments,
        restart: async () => {
          restarts += 1;
        },
      });
      middleware({ url: "/@hono-decks/events", method: "GET", on() {} }, { writeHead() {}, write: (data: string) => writes.push(data), end() {}, on() {} }, () => {});
      expect(watcher.added).toContain(join(cwd, "decks"));
      expect(watcher.added).toContain(join(cwd, "hono-decks.config.ts"));
      expect(ws.fullReloads).toBe(0);

      const deckPath = join(cwd, "decks", "intro", "deck.mdx");
      await writeFile(deckPath, "# Updated title\n", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(async () => (await readModule("src/generated/decks/intro/slide-0.ts")).includes("Updated title"));
      await waitFor(() => writes.length === 2);
      expect(events).toEqual(["client:invalidate", "worker:invalidate", "worker:reload"]);
      expect(writes).toEqual([": connected\n\n", "event: deck:updated\ndata: {}\n\n"]);

      await writeFile(deckPath, "<Broken", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(() => errors.length > 0);
      expect(ws.fullReloads).toBe(0);
      expect(writes).toHaveLength(2);
      expect(await readModule("src/generated/decks/intro/slide-0.ts")).toContain("Updated title");

      await writeFile(deckPath, "# Recovered title\n", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(async () => (await readModule("src/generated/decks/intro/slide-0.ts")).includes("Recovered title"));
      await waitFor(() => writes.length === 3);

      const nextRoot = join(cwd, "presentations");
      await mkdir(join(nextRoot, "next"), { recursive: true });
      await writeFile(join(nextRoot, "next", "deck.mdx"), "# Configured root\n", "utf8");
      const configPath = join(cwd, "hono-decks.config.ts");
      await writeFile(
        configPath,
        `export default {
  mountPath: "/decks",
  build: { root: "presentations", outDir: "src/generated" },
};
`,
        "utf8",
      );
      watcher.emit("change", configPath);
      await waitFor(async () => (await readModule("src/generated/decks/next/slide-0.ts")).includes("Configured root"));
      await waitFor(() => writes.length === 4);
      expect(watcher.added).toContain(nextRoot);
      expect(watcher.added).not.toContain(join(cwd, "decks"));

      await writeFile(
        configPath,
        'export default { mountPath: "/talks", build: { root: "presentations", outDir: "src/generated" } };',
        "utf8",
      );
      watcher.emit("change", configPath);
      await waitFor(() => restarts === 1);
      expect(ws.fullReloads).toBe(0);

      httpServer.close();
      expect(watcher.listener).toBeUndefined();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

class FakeWatcher {
  added: string[] = [];
  listener: ((event: string, path: string) => void) | undefined;

  add(paths: string[]): this {
    this.added.push(...paths);
    return this;
  }

  async unwatch(paths: string[]): Promise<this> {
    this.added = this.added.filter((path) => !paths.includes(path));
    return this;
  }

  on(event: string, listener: (event: string, path: string) => void): this {
    if (event === "all") this.listener = listener;
    return this;
  }

  off(event: string, listener: (event: string, path: string) => void): this {
    if (event === "all" && this.listener === listener) this.listener = undefined;
    return this;
  }

  emit(event: string, path: string): void {
    this.listener?.(event, path);
  }
}

class FakeWebSocket {
  fullReloads = 0;
  constructor(private readonly events: string[]) {}

  send(payload: { type: string }): void {
    if (payload.type === "full-reload") {
      this.fullReloads += 1;
      this.events.push("browser:reload");
    }
  }
}

class FakeHttpServer {
  closeListener: (() => void) | undefined;

  once(event: string, listener: () => void): this {
    if (event === "close") this.closeListener = listener;
    return this;
  }

  close(): void {
    this.closeListener?.();
    this.closeListener = undefined;
  }
}

async function createFixture(): Promise<string> {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "hono-decks-vite-")));
  await mkdir(join(cwd, "decks", "intro"), { recursive: true });
  await writeFile(
    join(cwd, "hono-decks.config.ts"),
    `export default {
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
};
`,
    "utf8",
  );
  await writeFile(join(cwd, "decks", "intro", "deck.mdx"), "# Initial title\n", "utf8");
  return cwd;
}

async function waitFor(check: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for Vite deck compilation");
}
