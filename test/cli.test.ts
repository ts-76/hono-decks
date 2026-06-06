import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runHonoSlidesCli } from "../src/cli";

describe("hono-slides CLI", () => {
  it("compiles local decks into a manifest module", async () => {
    const cwd = await createFixture();
    const stdout: string[] = [];

    try {
      const result = await runHonoSlidesCli({
        argv: ["compile", "--root", "decks", "--out", "src/generated/hono-slides-manifest.ts", "--mount", "/slides"],
        cwd,
        stdout: (line) => stdout.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(stdout.join("\n")).toContain("Compiled 2 decks");

      const output = await readFile(join(cwd, "src", "generated", "hono-slides-manifest.ts"), "utf8");
      expect(output).toContain("export const deckManifest =");
      expect(output).toContain('"slug": "intro"');
      expect(output).toContain('"publicPath": "/slides/intro/assets/hero.png"');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("reports usage errors without writing files", async () => {
    const cwd = await createFixture();
    const stderr: string[] = [];

    try {
      const result = await runHonoSlidesCli({
        argv: ["compile", "--root", "decks"],
        cwd,
        stderr: (line) => stderr.push(line),
      });

      expect(result.exitCode).toBe(1);
      expect(stderr.join("\n")).toContain("Missing required option: --out");
      await expect(readFile(join(cwd, "src", "generated", "hono-slides-manifest.ts"), "utf8")).rejects.toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("prints help", async () => {
    const stdout: string[] = [];

    const result = await runHonoSlidesCli({
      argv: ["--help"],
      cwd: "/workspace",
      stdout: (line) => stdout.push(line),
    });

    expect(result.exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("hono-slides compile --root decks --out src/generated/hono-slides-manifest.ts");
  });
});

async function createFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "hono-slides-cli-"));
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
