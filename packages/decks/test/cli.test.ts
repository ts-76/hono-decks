import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runHonoDecksCli } from "../src/node/cli";

describe("hono-decks CLI", () => {
  it("compiles local decks into generated router and slide modules", async () => {
    const cwd = await createFixture();
    const stdout: string[] = [];

    try {
      const result = await runHonoDecksCli({
        argv: ["compile", "--root", "decks", "--out", "src/generated", "--mount", "/slides"],
        cwd,
        stdout: (line) => stdout.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(stdout.join("\n")).toContain("Compiled 2 decks");

      const output = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(output).toContain('import { defineDecks } from "hono-decks";');
      expect(output).not.toContain("hono-decks/runtime");
      expect(output).toContain('import { decksClientEntry } from "./client-entry";');
      expect(output).toContain("export const decks = defineDecks({");
      expect(output).toContain("clientEntryAsset: decksClientEntry");
      expect(output).toContain('slug: "intro"');
      expect(output).toContain('"publicPath": "/slides/intro/assets/hero.png"');
      expect(output).toContain('import Slide_intro_0 from "./decks/intro/slide-0";');

      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain('from "hono/jsx/jsx-runtime"');

      const clientOutput = await readFile(join(cwd, "src", "generated", "client-entry.ts"), "utf8");
      expect(clientOutput).toBe('export const decksClientEntry = "";\n');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("imports deck-local components without rewriting MDX component names", async () => {
    const cwd = await createFixture();
    const stdout: string[] = [];

    try {
      await mkdir(join(cwd, "decks", "intro", "components"), { recursive: true });
      await writeFile(
        join(cwd, "decks", "intro", "components", "index.tsx"),
        `export function Badge() {
  return <p>Intro badge</p>;
}
`,
        "utf8",
      );
      await writeFile(
        join(cwd, "decks", "intro", "deck.mdx"),
        `# Intro

<Badge label="Intro" />`,
        "utf8",
      );

      const result = await runHonoDecksCli({
        argv: ["compile", "--root", "decks", "--out", "src/generated", "--mount", "/slides"],
        cwd,
        stdout: (line) => stdout.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(stdout.join("\n")).toContain("Compiled 2 decks");

      const routerOutput = await readFile(join(cwd, "src", "generated", "decks.ts"), "utf8");
      expect(routerOutput).toContain('import { defineDecks } from "hono-decks";');
      expect(routerOutput).toContain('import type { DecksRouterOverrides } from "hono-decks";');
      expect(routerOutput).toContain('import * as Components_intro from "../../decks/intro/components";');
      expect(routerOutput).toContain("componentRegistry: withClientComponentIds(Components_intro, {})");
      expect(routerOutput).toContain("export function decksRouter(options: DecksRouterOverrides = {})");

      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain("{Badge} = _components");
      expect(slideOutput).toContain("_jsx(Badge");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("uses an OGP cache file during compile", async () => {
    const cwd = await createFixture();

    try {
      await writeFile(
        join(cwd, "decks", "intro", "deck.mdx"),
        `# Intro

@[card](https://hono.dev/docs/)`,
        "utf8",
      );
      await writeFile(
        join(cwd, "decks", "ogp-cache.json"),
        JSON.stringify({
          "https://hono.dev/docs/": {
            title: "Cached Hono Docs",
            description: "Cached docs description.",
          },
        }),
        "utf8",
      );

      const result = await runHonoDecksCli({
        argv: [
          "compile",
          "--root",
          "decks",
          "--out",
          "src/generated",
          "--mount",
          "/slides",
          "--ogp-cache",
          "decks/ogp-cache.json",
        ],
        cwd,
      });

      expect(result.exitCode).toBe(0);
      const slideOutput = await readFile(join(cwd, "src", "generated", "decks", "intro", "slide-0.ts"), "utf8");
      expect(slideOutput).toContain('title: "Cached Hono Docs"');
      expect(slideOutput).toContain('description: "Cached docs description."');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("reports usage errors without writing files", async () => {
    const cwd = await createFixture();
    const stderr: string[] = [];

    try {
      const result = await runHonoDecksCli({
        argv: ["compile", "--root", "decks"],
        cwd,
        stderr: (line) => stderr.push(line),
      });

      expect(result.exitCode).toBe(1);
      expect(stderr.join("\n")).toContain("Missing required option: --out");
      await expect(readFile(join(cwd, "src", "generated", "hono-decks-manifest.ts"), "utf8")).rejects.toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("initializes an app-owned decks facade without overwriting existing files", async () => {
    const cwd = await createFixture();
    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      const result = await runHonoDecksCli({
        argv: ["init", "--out", "src/decks.ts"],
        cwd,
        stdout: (line) => stdout.push(line),
        stderr: (line) => stderr.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(stdout.join("\n")).toContain("Initialized decks facade at src/decks.ts");

      const facade = await readFile(join(cwd, "src", "decks.ts"), "utf8");
      expect(facade).toContain("App-owned facade for hono-decks.");
      expect(facade).toContain("This file is safe to edit.");
      expect(facade).toContain('import type { DecksRouterOverrides } from "hono-decks";');
      expect(facade).toContain('import { decks } from "./generated/decks";');
      expect(facade).toContain("export const deckSource = decks.source;");
      expect(facade).toContain("export function createDecksRouter");

      const second = await runHonoDecksCli({
        argv: ["init", "--out", "src/decks.ts"],
        cwd,
        stdout: (line) => stdout.push(line),
        stderr: (line) => stderr.push(line),
      });

      expect(second.exitCode).toBe(1);
      expect(stderr.join("\n")).toContain("Refusing to overwrite existing file: src/decks.ts");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("initializes a decks facade with a custom generated module path", async () => {
    const cwd = await createFixture();

    try {
      const result = await runHonoDecksCli({
        argv: ["init", "--out", "src/slides.ts", "--generated", "./generated/hono-decks"],
        cwd,
      });

      expect(result.exitCode).toBe(0);

      const facade = await readFile(join(cwd, "src", "slides.ts"), "utf8");
      expect(facade).toContain('import { decks } from "./generated/hono-decks";');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("reports MDX compile errors with deck file and slide context", async () => {
    const cwd = await createFixture();
    const stderr: string[] = [];

    try {
      await writeFile(
        join(cwd, "decks", "intro", "deck.mdx"),
        `---
title: Intro
---

# Intro

---
title: Broken
---

<Badge`,
        "utf8",
      );

      const result = await runHonoDecksCli({
        argv: ["compile", "--root", "decks", "--out", "src/generated", "--mount", "/slides"],
        cwd,
        stderr: (line) => stderr.push(line),
      });

      const error = stderr.join("\n");
      expect(result.exitCode).toBe(1);
      expect(error).toContain("MDX compile failed");
      expect(error).toContain("decks/intro/deck.mdx");
      expect(error).toContain("slide 2");
      await expect(readFile(join(cwd, "src", "generated", "decks.ts"), "utf8")).rejects.toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("prints help", async () => {
    const stdout: string[] = [];

    const result = await runHonoDecksCli({
      argv: ["--help"],
      cwd: "/workspace",
      stdout: (line) => stdout.push(line),
    });

    expect(result.exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("hono-decks compile --root decks --out src/generated");
    expect(stdout.join("\n")).toContain("hono-decks init --out src/decks.ts");
    expect(stdout.join("\n")).toContain("Output directory for generated deck modules.");
  });
});

async function createFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-decks-cli-"));
  await mkdir(join(cwd, "decks", "intro", "assets"), { recursive: true });
  await writeFile(
    join(cwd, "decks", "intro", "deck.mdx"),
    `---
title: Intro
---

# Intro

![Hero](./assets/hero.png)`,
    "utf8",
  );
  await writeFile(join(cwd, "decks", "intro", "assets", "hero.png"), new Uint8Array([1, 2, 3]));
  await writeFile(
    join(cwd, "decks", "closing.mdx"),
    `---
title: Closing
---

# Closing`,
    "utf8",
  );
  return cwd;
}
