import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { toDeckFrontmatter, addUnknownFrontmatterWarnings } from "../src/deck/frontmatter";
import { talkPace } from "../src/renderer/presentation-page";
import { decksRouter } from "../src/server/router";
import { manifestDeckSource } from "../src/source/manifest-source";
import { deck } from "./support/router-fixtures";
import type { CompileWarning } from "../src/deck/model";

describe("presenter duration", () => {
  it.each([
    ["20m", 1200],
    ["1h30m", 5400],
    ["90s", 90],
    [2, 120],
  ])("parses %s", (value, seconds) => {
    const warnings: CompileWarning[] = [];
    const meta = toDeckFrontmatter({ duration: value }, warnings);
    addUnknownFrontmatterWarnings(warnings, meta.meta, "deck");
    expect(meta.duration).toBe(seconds);
    expect(warnings).toEqual([]);
  });
  it.each(["bad", "0s", -1, {}, "1m2h"])("warns about invalid %s without an unknown-key warning", (value) => {
    const warnings: CompileWarning[] = [];
    const meta = toDeckFrontmatter({ duration: value }, warnings);
    addUnknownFrontmatterWarnings(warnings, meta.meta, "deck");
    expect(meta.duration).toBeUndefined();
    expect(warnings.map((warning) => warning.code)).toEqual(["invalid-duration"]);
  });
  it("renders the frontmatter target and lets router options override it", async () => {
    const source = manifestDeckSource({ decks: [{ ...deck, meta: { ...deck.meta, duration: 1200 } }] });
    const app = new Hono();
    app.route("/a", decksRouter({ source }));
    app.route("/b", decksRouter({ source, presenter: { duration: "90s" } }));
    const a = await (await app.request("/a/deck1/presenter")).text();
    const b = await (await app.request("/b/deck1/presenter")).text();
    expect(a).toContain("const duration = 1200;");
    expect(b).toContain("const duration = 90;");
    expect(b).toContain('role="timer" aria-live="off"');
    const formatSource = b.match(/  function formatTime\(seconds\) \{[\s\S]*?\n  \}/)?.[0];
    expect(formatSource).toBeDefined();
    const format = new Function(`${formatSource}; return formatTime;`)() as (seconds: number) => string;
    expect(format(65)).toBe("01:05");
    expect(format(3661)).toBe("1:01:01");
    expect(format(-90)).toBe("01:30");
  });

  it("judges pace against the current slide's share of the duration", () => {
    // 10 slides in 600 s → 60 s per slide.
    expect(talkPace(10, 600, 0, 10)).toEqual({ state: "on", seconds: 0 });
    expect(talkPace(59, 600, 0, 10)).toEqual({ state: "on", seconds: 0 });
    expect(talkPace(90, 600, 0, 10)).toEqual({ state: "behind", seconds: 30 });
    expect(talkPace(30, 600, 2, 10)).toEqual({ state: "ahead", seconds: 90 });
    expect(talkPace(150, 600, 2, 10)).toEqual({ state: "on", seconds: 0 });
    expect(talkPace(700, 600, 9, 10)).toEqual({ state: "behind", seconds: 100 });
  });

  it("embeds the pace helper in the presenter script and keeps notes growing", async () => {
    const source = manifestDeckSource({ decks: [{ ...deck, meta: { ...deck.meta, duration: 1200 } }] });
    const html = await (await new Hono().route("/a", decksRouter({ source })).request("/a/deck1/presenter")).text();
    expect(html).toContain("const talkPace = function talkPace(");
    expect(html).toContain("grid-template-rows:auto auto 1fr");
  });
});
