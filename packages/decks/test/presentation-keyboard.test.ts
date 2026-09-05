import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderPresentationScript } from "../src/renderer/presentation-script";

// Run the emitted runtime with a minimal DOM boundary, so the tests exercise
// the registered listener and navigation state rather than matching source text.
function presentation() {
  class Element {
    hidden = false;
    isContentEditable = false;
    interactive = false;
    attributes = new Map<string, string>();
    style = { setProperty() {}, removeProperty() {} };
    getAttribute(name: string) {
      return this.attributes.get(name) ?? null;
    }
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }
    removeAttribute(name: string) {
      this.attributes.delete(name);
    }
    hasAttribute(name: string) {
      return this.attributes.has(name);
    }
    closest() {
      return this.interactive ? this : null;
    }
    querySelectorAll() {
      return [];
    }
    addEventListener() {}
  }
  const slides = [new Element(), new Element()];
  const listeners = new Map<string, (event: object) => void>();
  const body = new Element();
  const location = { href: "https://slides.example/render", search: "", origin: "https://slides.example" };
  const window = {
    location,
    parent: null as unknown,
    history: {
      replaceState(_state: unknown, _title: string, url: URL) {
        location.href = url.href;
      },
    },
    addEventListener() {},
  };
  window.parent = window;
  runInNewContext(renderPresentationScript().replace(/^<script>\s*|\s*<\/script>$/g, ""), {
    window,
    URL,
    URLSearchParams,
    HTMLElement: Element,
    document: {
      body,
      querySelector: () => null,
      querySelectorAll: (selector: string) => (selector === ".slide" ? slides : []),
      addEventListener: (type: string, listener: (event: object) => void) => listeners.set(type, listener),
    },
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
  });
  return {
    key(key: string, overrides: object = {}) {
      const preventDefault = vi.fn();
      listeners.get("keydown")!({ key, target: body, preventDefault, ...overrides });
      return preventDefault;
    },
    element: () => new Element(),
    slide: () => new URL(location.href).searchParams.get("slide"),
  };
}

describe("presentation keyboard navigation", () => {
  it("advances with arrow and space keys and prevents native scrolling", () => {
    const runtime = presentation();
    expect(runtime.key("ArrowRight")).toHaveBeenCalledOnce();
    expect(runtime.slide()).toBe("2");
    runtime.key("ArrowLeft");
    expect(runtime.slide()).toBe("1");
    expect(runtime.key(" ")).toHaveBeenCalledOnce();
    expect(runtime.slide()).toBe("2");
  });

  it.each(["ArrowRight", " ", "f", "p", "o"])("leaves %s to interactive controls and editable content", (key) => {
    const runtime = presentation();
    const control = runtime.element();
    control.interactive = true;
    expect(runtime.key(key, { target: control })).not.toHaveBeenCalled();
    control.interactive = false;
    control.isContentEditable = true;
    expect(runtime.key(key, { target: control })).not.toHaveBeenCalled();
    expect(runtime.slide()).toBe("1");
  });

  it.each(["metaKey", "ctrlKey", "altKey", "defaultPrevented"])("respects %s", (flag) => {
    const runtime = presentation();
    expect(runtime.key("ArrowRight", { [flag]: true })).not.toHaveBeenCalled();
    expect(runtime.slide()).toBe("1");
  });
});
