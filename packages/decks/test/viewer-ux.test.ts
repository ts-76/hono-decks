import { runInNewContext } from "node:vm";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter } from "../src/server/router";
import { renderViewerScript } from "../src/server/viewer-script";
import { deck } from "./support/router-fixtures";

function keyboard() {
  class Element {
    isContentEditable = false;
    editable = false;
    closest() {
      return this.editable ? this : null;
    }
  }
  const commands: unknown[][] = [];
  const listeners = new Map<string, (event: any) => void>();
  const iframe = {
    src: "https://example.test/render",
    contentWindow: { __honoDecksPresentationRuntime: { command: (...args: unknown[]) => commands.push(args) } },
    addEventListener() {},
  };
  const root = {
    hasAttribute: () => false,
    setAttribute() {},
    removeAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: (selector: string) => (selector === "iframe" ? iframe : null),
  };
  const document = {
    activeElement: null,
    querySelectorAll: () => [root],
    addEventListener: (type: string, fn: (event: any) => void) => listeners.set(type, fn),
  };
  const window = {
    location: { href: "https://example.test/view", origin: "https://example.test" },
    addEventListener() {},
  };
  runInNewContext(renderViewerScript().replace(/^<script[^>]*>\s*|\s*<\/script>$/g, ""), {
    window,
    document,
    HTMLElement: Element,
    URL,
    setTimeout,
    clearTimeout,
  });
  return {
    commands,
    element: () => new Element(),
    key: (key: string, extra = {}) => {
      const preventDefault = vi.fn();
      listeners.get("keydown")!({ key, target: new Element(), preventDefault, ...extra });
      return preventDefault;
    },
  };
}

describe("viewer UX", () => {
  it("maps navigation keys and ignores modifiers and editable targets", () => {
    const v = keyboard();
    for (const key of ["ArrowRight", "PageDown", " "]) v.key(key);
    for (const key of ["ArrowLeft", "PageUp"]) v.key(key);
    v.key(" ", { shiftKey: true });
    v.key("Home");
    v.key("End");
    expect(v.commands.map(([action]) => action)).toEqual([
      "next",
      "next",
      "next",
      "previous",
      "previous",
      "previous",
      "goTo",
      "goTo",
    ]);
    for (const flag of ["ctrlKey", "metaKey", "altKey"]) v.key("ArrowRight", { [flag]: true });
    const editable = v.element();
    editable.editable = true;
    v.key("ArrowRight", { target: editable });
    expect(v.commands).toHaveLength(8);
  });
  it.each([true, false])("renders TOC and nonce with autoHide %s", async (autoHide) => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: { controls: { autoHide } },
        document: { nonce: "test-nonce" },
      }),
    );
    const html = await (await app.request("/slides/deck1")).text();
    expect(html).toContain(`data-hono-decks-autohide="${autoHide ? "2500" : "0"}"`);
    expect(html).toContain('data-hono-decks-toc-panel="true"');
    expect(html).toContain('data-action="toc"');
    expect(html).toContain('<dialog class="hono-decks-shortcuts"');
    for (const tag of html.match(/<(?:script|style)\b[^>]*>/g) ?? []) expect(tag).toContain('nonce="test-nonce"');
    expect(html).not.toMatch(/\sstyle="/);
  });
});
