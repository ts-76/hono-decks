import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { honoDecks } from "../src/vite";

describe("honoDecks Vite plugin", () => {
  it("compiles before Vite starts and recompiles deck changes through Vite's watcher", async () => {
    const cwd = await createFixture();
    const watcher = new FakeWatcher();
    const httpServer = new FakeHttpServer();
    const info: string[] = [];
    const errors: string[] = [];
    const plugin = honoDecks();

    try {
      const configResolved = plugin.configResolved;
      expect(typeof configResolved).toBe("function");
      await (configResolved as Function)({
        root: cwd,
        logger: {
          info: (message: string) => info.push(message),
          error: (message: string) => errors.push(message),
        },
      });

      const initial = await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8");
      expect(initial).toContain("Initial title");
      expect(info.some((message) => message.includes("Compiled 1 decks"))).toBe(true);

      const configureServer = plugin.configureServer;
      expect(typeof configureServer).toBe("function");
      (configureServer as Function)({ watcher, httpServer });
      expect(watcher.added).toContain(join(cwd, "decks"));
      expect(watcher.added).toContain(join(cwd, "hono-decks.config.ts"));

      const deckPath = join(cwd, "decks", "intro", "deck.mdx");
      await writeFile(deckPath, "# Updated title\n", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(async () => (await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8")).includes("Updated title"));

      await writeFile(deckPath, "<Broken", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(() => errors.length > 0);

      await writeFile(deckPath, "# Recovered title\n", "utf8");
      watcher.emit("change", deckPath);
      await waitFor(async () => (await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8")).includes("Recovered title"));

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
      await waitFor(async () => (await readFile(join(cwd, "src", "generated", "decks", "next", "slide-0.ts"), "utf8")).includes("Configured root"));
      expect(watcher.added).toContain(nextRoot);
      expect(watcher.added).not.toContain(join(cwd, "decks"));

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
  const cwd = await mkdtemp(join(tmpdir(), "hono-decks-vite-"));
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
