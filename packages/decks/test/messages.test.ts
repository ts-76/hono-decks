import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { enMessages, jaMessages, resolveMessages } from "../src/shared/messages";
import { decksRouter } from "../src/server/router";
import { manifestDeckSource } from "../src/source/manifest-source";
import { deck } from "./support/router-fixtures";
import { localizedSlideComponents, renderJsxValue } from "../src/renderer/jsx-renderer";

describe("UI messages", () => {
  it("provides every catalog key in both languages", () => {
    expect(Object.keys(jaMessages).sort()).toEqual(Object.keys(enMessages).sort());
  });
  it("selects Japanese variants, falls back to English, and merges locale overrides", () => {
    expect(resolveMessages("ja-JP").previous).toBe("前のスライド");
    expect(resolveMessages("fr").previous).toBe("Previous slide");
    expect(resolveMessages("ja", { ja: { previous: "戻る" }, en: { next: "Forward" } }).previous).toBe("戻る");
    expect(resolveMessages("en", { ja: { previous: "戻る" }, en: { next: "Forward" } }).next).toBe("Forward");
  });
  it("renders localized surfaces and sends the progress template to the runtime", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        document: { lang: "ja" },
        embed: {},
        remote: { namespace: () => ({}) as DurableObjectNamespace, authorize: () => true },
        messages: { ja: { previous: "戻る", slidePosition: "{current}/{total}枚" } },
      }),
    );
    const viewer = await (await app.request("/slides/deck1")).text();
    expect(viewer).toContain('aria-label="戻る"');
    expect(viewer).toContain("キーボードショートカット");
    expect(viewer).toContain("目次");
    expect(viewer).toContain("追従を停止");
    expect(viewer).toContain('aria-valuetext="1/1枚"');
    expect(viewer).toContain('data-hono-decks-slide-position-template="{current}/{total}枚"');
    expect(await (await app.request("/slides/deck1/overview")).text()).toContain("スライド一覧");
    const presenter = await (await app.request("/slides/deck1/presenter")).text();
    expect(presenter).toContain("発表者画面");
    expect(presenter).toContain("発表タイマー");
    expect(presenter).toContain("予定どおり");
    expect(await (await app.request("/slides/deck1/remote")).text()).toContain("リモート操作");
    expect(await (await app.request("/slides/deck1/embed")).text()).toContain("ビューアーを新しいタブで開く");
  });
  it("localizes slide component fallbacks and safely serializes overrides", async () => {
    const components = localizedSlideComponents(resolveMessages("ja"), "nonce-value");
    const embed = await renderJsxValue(components.EmbedFrame.component({ src: "https://example.com" }));
    const tweet = await renderJsxValue(components.TweetEmbed.component({ href: "https://example.com" }));
    expect(embed).toContain("埋め込みコンテンツ");
    expect(embed).toContain("埋め込みを開く");
    expect(tweet).toContain("Xで投稿を開く");
    expect(tweet).toContain('nonce="nonce-value"');
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        document: { lang: "ja", nonce: "nonce-value" },
        messages: { ja: { timerStart: "</script><script>bad()</script>", remoteConnecting: "</script>" } },
        remote: { namespace: () => ({}) as DurableObjectNamespace, authorize: () => true },
      }),
    );
    const presenter = await (await app.request("/slides/deck1/presenter")).text();
    expect(presenter).not.toContain("</script><script>bad()");
    expect(presenter).toContain("\\u003c/script>");
    expect(presenter).toContain('nonce="nonce-value"');
  });
  it("keeps explicit control labels ahead of catalog messages", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        document: { lang: "ja" },
        messages: { ja: { previous: "戻る" } },
        viewer: { controls: { labels: { previous: "独自" } } },
      }),
    );
    expect(await (await app.request("/slides/deck1")).text()).toContain("独自");
  });
});
