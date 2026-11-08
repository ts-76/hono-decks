import { describe, expect, it, vi } from "vite-plus/test";
import { Hono } from "hono";
import { toDeckFrontmatter, addUnknownFrontmatterWarnings } from "../src/deck/frontmatter";
import { formatTalkTime, talkPace } from "../src/renderer/presentation-page";
import { epochNow, formatClock } from "../src/shared/talk-time";
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
    expect(a).toContain("let duration = 1200;");
    expect(b).toContain("let duration = 90;");
    expect(b).toContain('role="timer" aria-live="off"');
    expect(b).toContain("const formatTime = function formatTalkTime(");
    expect(formatTalkTime(65)).toBe("01:05");
    expect(formatTalkTime(3661)).toBe("1:01:01");
    expect(formatTalkTime(-90)).toBe("01:30");
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

  it("reads time from Temporal when available and falls back to Date", () => {
    vi.stubGlobal("Temporal", {
      Now: {
        instant: () => ({ epochMilliseconds: 42 }),
        plainTimeISO: () => ({ toLocaleString: (_locale?: string, _options?: object) => "12:34:56" }),
      },
    });
    try {
      expect(epochNow()).toBe(42);
      expect(formatClock("ja")).toBe("12:34:56");
      expect(epochNow.toString()).toContain("Temporal");
    } finally {
      vi.unstubAllGlobals();
    }
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      expect(epochNow()).toBe(1_000);
      expect(formatClock("en-US")).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders a target input and hides remaining time and pace until a target is set", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), document: { lang: "ja" } }));
    const html = await (await app.request("/slides/deck1/presenter")).text();
    expect(html).toContain(
      '<input type="number" min="1" max="1440" step="any" inputmode="decimal" data-timer-target value="">',
    );
    expect(html).toContain("<div data-timer-remaining-box hidden>");
    expect(html).toContain("data-timer-pace hidden");
    expect(html).toContain("目標時間");
    expect(html).toContain('"hono-decks:duration:"');
    const timed = new Hono();
    timed.route(
      "/slides",
      decksRouter({ source: manifestDeckSource({ decks: [deck] }), presenter: { duration: "90s" } }),
    );
    const timedHtml = await (await timed.request("/slides/deck1/presenter")).text();
    expect(timedHtml).toContain('data-timer-target value="1.5"');
    expect(timedHtml).toContain("<div data-timer-remaining-box>");
  });
});
