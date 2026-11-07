import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderPresentationScript } from "../src/renderer/presentation-script";

// Run the emitted runtime with a minimal DOM boundary, so the tests exercise
// the registered listener and navigation state rather than matching source text.
function presentation({ prefetch = false, saveData = false } = {}) {
  class TestImage {
    src = "https://slides.example/image.png";
    srcset = "";
    sizes = "";
    loading = "lazy";
    decode = vi.fn(() => Promise.resolve());
  }
  const idle: Array<() => void> = [];
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
    images: TestImage[] = [];
    querySelectorAll(selector?: string) {
      return selector === "img" ? this.images : [];
    }
    addEventListener() {}
  }
  const slides = [new Element(), new Element(), new Element()];
  const images = [new TestImage(), new TestImage()];
  if (prefetch) {
    slides[1]!.images.push(images[0]!);
    slides[2]!.images.push(images[1]!);
  }
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
  runInNewContext(renderPresentationScript().replace(/^<script>\s*|\s*<\/script>$/gi, ""), {
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
    getComputedStyle: () => ({ getPropertyValue: () => "", backgroundImage: "none" }),
    navigator: { connection: { saveData } },
    setTimeout: (callback: () => void) => {
      idle.push(callback);
      return idle.length;
    },
  });
  return {
    key(key: string, overrides: object = {}) {
      const preventDefault = vi.fn();
      listeners.get("keydown")!({ key, target: body, preventDefault, ...overrides });
      return preventDefault;
    },
    images,
    flushPreloads: () => idle.splice(0).forEach((callback) => callback()),
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

describe("next slide image preparation", () => {
  it("decodes only the next slide and reuses prepared images on return navigation", () => {
    const runtime = presentation({ prefetch: true });
    runtime.flushPreloads();
    expect(runtime.images[0]!.loading).toBe("eager");
    expect(runtime.images[0]!.decode).toHaveBeenCalledOnce();
    expect(runtime.images[1]!.decode).not.toHaveBeenCalled();
    runtime.key("ArrowRight");
    runtime.flushPreloads();
    expect(runtime.images[0]!.decode).toHaveBeenCalledOnce();
    expect(runtime.images[1]!.decode).toHaveBeenCalledOnce();
    runtime.key("ArrowLeft");
    runtime.flushPreloads();
    expect(runtime.images[0]!.decode).toHaveBeenCalledOnce();
  });

  it("honors data saver for speculative loads while still preparing requested slides", () => {
    const runtime = presentation({ prefetch: true, saveData: true });
    runtime.flushPreloads();
    expect(runtime.images[0]!.decode).not.toHaveBeenCalled();
    runtime.key("ArrowRight");
    expect(runtime.images[0]!.decode).toHaveBeenCalledOnce();
  });
});
