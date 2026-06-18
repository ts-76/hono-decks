import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runHonoSlidesCli } from "../src/node/cli";

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

  it("generates a deck component registry module and rewrites component names to stable internal names", async () => {
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

      const result = await runHonoSlidesCli({
        argv: [
          "compile",
          "--root",
          "decks",
          "--out",
          "src/generated/hono-slides-manifest.ts",
          "--components-out",
          "src/generated/hono-slides-components.ts",
          "--mount",
          "/slides",
        ],
        cwd,
        stdout: (line) => stdout.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(stdout.join("\n")).toContain("Compiled 2 decks");
      expect(stdout.join("\n")).toContain("Generated deck component registry to src/generated/hono-slides-components.ts");

      const manifestOutput = await readFile(join(cwd, "src", "generated", "hono-slides-manifest.ts"), "utf8");
      const internalName = /"name": "(Badge__intro_[a-z0-9]+)"/.exec(manifestOutput)?.[1];
      expect(internalName).toBeTruthy();
      expect(manifestOutput).not.toContain('"name": "Badge"');

      const registryOutput = await readFile(join(cwd, "src", "generated", "hono-slides-components.ts"), "utf8");
      expect(registryOutput).toContain('import { defineSlideComponents } from "hono-slides";');
      expect(registryOutput).toContain('import { Badge as Badge__intro_');
      expect(registryOutput).toContain('} from "../../decks/intro/components";');
      expect(registryOutput).toContain(`"${internalName}": ${internalName}`);
      expect(registryOutput).toContain("export const deckComponents = defineSlideComponents({");
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
