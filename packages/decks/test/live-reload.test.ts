import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderLiveReloadScript } from "../src/renderer/presentation-script";

function setup(options: { failFetch?: boolean; changedProps?: boolean; changedClient?: boolean; pending?: boolean; changedContext?: boolean; markdownMounted?: boolean; registered?: boolean } = {}) {
  let listener: (() => Promise<void>) | undefined;
  const oldIsland = island("counter", "1", Boolean(options.pending || options.markdownMounted), '{"headings":["old"]}', Boolean(options.markdownMounted));
  const newIsland = island("counter", options.changedProps ? "2" : "1", Boolean(options.pending || options.markdownMounted), options.changedContext ? '{"headings":["new"]}' : '{"headings":["old"]}', Boolean(options.markdownMounted));
  const oldSlide = {
    querySelectorAll: () => [oldIsland], attributes: [{ name: "old" }],
    removeAttribute: vi.fn(), setAttribute: vi.fn(), replaceChildren: vi.fn(),
  };
  const newSlide = {
    querySelectorAll: () => [newIsland], attributes: [{ name: "class", value: "slide" }],
    childNodes: [newIsland], replaceWith: vi.fn(),
  };
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
      if (selector === "script[data-hono-decks-client-entry]") return { getAttribute: () => "/entry.js" };
      return null;
    },
  };
  const document = {
    readyState: "complete", title: "Original",
    querySelector(selector: string) {
      if (selector === "[data-hono-decks-deck]") return oldDeck;
      if (selector === "[data-hono-decks-presentation-style]") return style;
      if (selector === "script[data-hono-decks-client-entry]") return { src: "/entry.js" };
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
    text: async () => url === "/entry.js" ? (options.changedClient ? `client ${++clientRequests}` : "client") : "new html",
  }));
  const runtimeWindow: { __honoDecksPresentationRuntime: { refresh: typeof refresh }; __honoDecksLive?: { register(element: object, update: (value: unknown) => void): void } } = {
    __honoDecksPresentationRuntime: { refresh },
  };
  const updateProps = vi.fn();
  runInNewContext(renderLiveReloadScript("/events").replace(/^<script>\s*|\s*<\/script>$/gi, ""), {
    EventSource, DOMParser, fetch, document, location: { href: "https://example.test/render", reload },
    window: runtimeWindow, console,
  });
  if (options.registered) runtimeWindow.__honoDecksLive!.register(oldIsland, updateProps);
  return { updateProps, update: () => listener!(), newIsland, oldIsland, oldSlide, newSlide, oldDeck, style, document, refresh, reload };
}

function island(id: string, props: string, markdown = false, context = "old", mounted = false) {
  return {
    hasAttribute: (name: string) => name === (markdown ? "data-hono-md-island" : "data-hono-decks-island") || (mounted && name === "data-hono-md-mounted"),
    getAttribute: (name: string) => name === (markdown ? "data-hono-md-island" : "data-hono-decks-island") ? id : name === (markdown ? "data-hono-md-props" : "data-hono-decks-props") ? props : null,
    closest: () => markdown ? { getAttribute: () => context } : null,
    replaceWith: vi.fn(),
    setAttribute: vi.fn(),
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

  it("updates registered MDX island props without remounting it", async () => {
    const test = setup({ changedProps: true, registered: true });
    await test.update();
    expect(test.newIsland.replaceWith).toHaveBeenCalledWith(test.oldIsland);
    expect(test.updateProps).toHaveBeenCalledWith(2);
    expect(test.reload).not.toHaveBeenCalled();
  });

  it("updates mounted Markdown island props and context through its registered wrapper", async () => {
    const test = setup({ markdownMounted: true, changedContext: true, changedProps: true, registered: true });
    await test.update();
    expect(test.updateProps).toHaveBeenCalledWith({ props: 2, context: { headings: ["new"] } });
    expect(test.reload).not.toHaveBeenCalled();
  });

  it("retains the observed slide while a Markdown island is waiting to hydrate", async () => {
    const test = setup({ pending: true, changedContext: true });
    await test.update();
    expect(test.newIsland.replaceWith).toHaveBeenCalledWith(test.oldIsland);
    expect(test.oldSlide.replaceChildren).toHaveBeenCalledWith(test.newIsland);
    expect(test.newSlide.replaceWith).toHaveBeenCalledWith(test.oldSlide);
    expect(test.refresh).toHaveBeenCalledOnce();
    expect(test.reload).not.toHaveBeenCalled();
  });

  it.each([{ failFetch: true }, { changedProps: true }, { changedClient: true }, { markdownMounted: true, changedContext: true }])("reloads without replacing the deck when an update cannot be safely applied: %o", async (options) => {
    const test = setup(options);
    await test.update();
    expect(test.oldDeck.replaceChildren).not.toHaveBeenCalled();
    expect(test.refresh).not.toHaveBeenCalled();
    expect(test.reload).toHaveBeenCalledOnce();
  });
});

function structure(before: string[], after: string[], options: { failHydrate?: boolean; removeEntry?: boolean } = {}) {
  let listener: (() => Promise<void>) | undefined;
  function makeIsland(label: string) {
    let mounted = false;
    return {
      label,
      hasAttribute: (name: string) => name === "data-hono-decks-island" || (name === "data-hono-decks-live-mounted" && mounted),
      getAttribute: (name: string) => name === "data-hono-decks-island" ? "Counter" : name === "data-hono-decks-props" ? JSON.stringify({ label }) : null,
      closest: () => null,
      replaceWith: vi.fn(),
      mount: () => { mounted = true; },
    };
  }
  const oldIslands = before.map(makeIsland);
  const newIslands = after.map(makeIsland);
  const oldSlide = { querySelectorAll: () => oldIslands };
  const newSlide = { querySelectorAll: () => newIslands };
  const oldDeck = { querySelectorAll: () => [oldSlide], querySelector: () => null, replaceChildren: vi.fn() };
  const newDeck = { querySelectorAll: () => [newSlide], querySelector: () => null, childNodes: [newSlide] };
  const client = { src: "/entry.js", getAttribute: () => "/entry.js" };
  const style = { textContent: "style" };
  const document = {
    readyState: "complete", title: "Deck",
    querySelector: (selector: string) => selector === "[data-hono-decks-deck]" ? oldDeck : selector === "[data-hono-decks-presentation-style]" ? style : client,

  };
  const next = { title: "Deck", querySelector: (selector: string) => selector === "[data-hono-decks-deck]" ? newDeck : selector === "[data-hono-decks-presentation-style]" ? style : options.removeEntry ? null : client };
  const reload = vi.fn();
  const refresh = vi.fn();
  const window: { __honoDecksPresentationRuntime: { refresh: typeof refresh }; __honoDecksLive?: { register(element: object, update: () => void, dispose: () => void): void; registerHydrator(hydrate: () => void): void } } = { __honoDecksPresentationRuntime: { refresh } };
  class EventSource { addEventListener(_name: string, callback: () => Promise<void>) { listener = callback; } }
  class DOMParser { parseFromString() { return next; } }
  class Event { constructor(public type: string) {} }
  const fetch = async () => ({ ok: true, headers: { get: () => "text/html" }, text: async () => "same client" });
  runInNewContext(renderLiveReloadScript("/events").replace(/^<script>\s*|\s*<\/script>$/gi, ""), {
    EventSource, DOMParser, Event, fetch, document, window, location: { href: "https://example.test/render", reload }, console,
  });
  const hydrate = vi.fn(() => { if (!options.failHydrate) newIslands.forEach((item) => item.mount()); });
  window.__honoDecksLive!.registerHydrator(hydrate);
  const disposers = oldIslands.map(() => vi.fn());
  oldIslands.forEach((element, index) => window.__honoDecksLive!.register(element, vi.fn(), disposers[index]!));
  return { update: () => listener!(), oldIslands, newIslands, oldDeck, hydrate, disposers, refresh, reload };
}

describe("live island structure", () => {
  it("matches reordered instances and initializes a new one without remounting existing instances", async () => {
    const test = structure(["A", "B"], ["B", "A", "C"]);
    await test.update();
    expect(test.newIslands[0]!.replaceWith).toHaveBeenCalledWith(test.oldIslands[1]);
    expect(test.newIslands[1]!.replaceWith).toHaveBeenCalledWith(test.oldIslands[0]);
    expect(test.hydrate).toHaveBeenCalledOnce();
    expect(test.disposers[0]).not.toHaveBeenCalled();
    expect(test.disposers[1]).not.toHaveBeenCalled();
    expect(test.reload).not.toHaveBeenCalled();
  });

  it("disposes removed islands before replacing the deck", async () => {
    const test = structure(["A", "B"], ["A"]);
    await test.update();
    expect(test.disposers[1]).toHaveBeenCalledOnce();
    expect(test.disposers[0]).not.toHaveBeenCalled();
    expect(test.oldDeck.replaceChildren).toHaveBeenCalledOnce();
    expect(test.reload).not.toHaveBeenCalled();
  });

  it("disposes the last island even when the next page no longer needs a client entry", async () => {
    const test = structure(["A"], [], { removeEntry: true });
    await test.update();
    expect(test.disposers[0]).toHaveBeenCalledOnce();
    expect(test.oldDeck.replaceChildren).toHaveBeenCalledOnce();
    expect(test.reload).not.toHaveBeenCalled();
  });

  it("falls back to reload if the client cannot initialize a newly inserted island", async () => {
    const test = structure(["A"], ["A", "B"], { failHydrate: true });
    await test.update();
    expect(test.hydrate).toHaveBeenCalledOnce();
    expect(test.reload).toHaveBeenCalledOnce();
  });

  it("does not transfer state when changed props also move to another position", async () => {
    const test = structure(["A", "B"], ["B", "C"]);
    await test.update();
    expect(test.reload).toHaveBeenCalledOnce();
    expect(test.oldDeck.replaceChildren).not.toHaveBeenCalled();
  });

  it("reloads rather than assigning state ambiguously when identical islands are added", async () => {
    const test = structure(["A"], ["A", "A"]);
    await test.update();
    expect(test.reload).toHaveBeenCalledOnce();
    expect(test.oldDeck.replaceChildren).not.toHaveBeenCalled();
  });
});
