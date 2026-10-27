import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderLiveReloadScript } from "../src/renderer/presentation-script";

function setup(options: { failFetch?: boolean; changedProps?: boolean; changedClient?: boolean } = {}) {
  let listener: (() => Promise<void>) | undefined;
  const oldIsland = island("counter", "1");
  const newIsland = island("counter", options.changedProps ? "2" : "1");
  const oldSlide = { querySelectorAll: () => [oldIsland] };
  const newSlide = { querySelectorAll: () => [newIsland] };
  const oldDeck = { querySelectorAll: () => [oldSlide], querySelector: () => null, replaceChildren: vi.fn() };
  const newDeck = { querySelectorAll: () => [newSlide], querySelector: (selector: string) => selector === "script" ? null : newIsland, childNodes: [newSlide] };
  const style = { textContent: "old style" };
  const refresh = vi.fn();
  const reload = vi.fn();
  const next = {
    title: "Updated",
    querySelector(selector: string) {
      if (selector === "[data-hono-decks-deck]") return newDeck;
      if (selector === "[data-hono-decks-presentation-style]") return { textContent: "new style" };
      if (selector === "script[data-hono-decks-client-entry]" && options.changedClient) return { getAttribute: () => "/entry.js" };
      return null;
    },
  };
  const document = {
    readyState: "complete", title: "Original",
    querySelector(selector: string) {
      if (selector === "[data-hono-decks-deck]") return oldDeck;
      if (selector === "[data-hono-decks-presentation-style]") return style;
      if (selector === "script[data-hono-decks-client-entry]" && options.changedClient) return { src: "/entry.js" };
      return null;
    },
  };
  class EventSource {
    addEventListener(_event: string, callback: () => Promise<void>) { listener = callback; }
  }
  class DOMParser { parseFromString() { return next; } }
  let clientRequests = 0;
  const fetch = vi.fn(async (url: string) => ({
    ok: !options.failFetch,
    headers: { get: () => "text/html" },
    text: async () => url === "/entry.js" ? `client ${++clientRequests}` : "new html",
  }));
  runInNewContext(renderLiveReloadScript("/events").replace(/^<script>\s*|\s*<\/script>$/gi, ""), {
    EventSource, DOMParser, fetch, document, location: { href: "https://example.test/render", reload },
    window: { __honoDecksPresentationRuntime: { refresh } }, console,
  });
  return { update: () => listener!(), newIsland, oldIsland, oldDeck, style, document, refresh, reload };
}

function island(id: string, props: string) {
  return {
    hasAttribute: (name: string) => name === "data-hono-decks-island",
    getAttribute: (name: string) => name === "data-hono-decks-island" ? id : name === "data-hono-decks-props" ? props : null,
    closest: () => null,
    replaceWith: vi.fn(),
  };
}

describe("live deck updates", () => {
  it("retains matching islands and refreshes the presentation after swapping content", async () => {
    const test = setup();
    await test.update();
    expect(test.newIsland.replaceWith).toHaveBeenCalledWith(test.oldIsland);
    expect(test.oldDeck.replaceChildren).toHaveBeenCalledOnce();
    expect(test.style.textContent).toBe("new style");
    expect(test.document.title).toBe("Updated");
    expect(test.refresh).toHaveBeenCalledOnce();
    expect(test.reload).not.toHaveBeenCalled();
  });

  it.each([{ failFetch: true }, { changedProps: true }, { changedClient: true }])("reloads without replacing the deck when an update cannot be safely applied: %o", async (options) => {
    const test = setup(options);
    await test.update();
    expect(test.oldDeck.replaceChildren).not.toHaveBeenCalled();
    expect(test.refresh).not.toHaveBeenCalled();
    expect(test.reload).toHaveBeenCalledOnce();
  });
});
