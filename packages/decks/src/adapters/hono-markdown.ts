import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DeckMarkdownAdapter, MarkdownIsland } from "../node/markdown-adapter";

/** Node-only bridge. Existing Void configs retain their original compiler/runtime pair. */
export async function createHonoMarkdownAdapter(
  cwd: string,
  legacy = false,
  options?: Record<string, unknown>,
): Promise<DeckMarkdownAdapter> {
  const require = createRequire(resolve(cwd, "package.json"));
  // Keep an existing provider's context/runtime together even when a newer
  // common compiler happens to be installed beside the legacy adapter.
  const entry = legacy ? "void-plugin-hono-jsx/markdown/compiler" : "@ts-76/hono-markdown/compiler";
  let compiler;
  try {
    compiler = await import(pathToFileURL(require.resolve(entry)).href);
  } catch (cause) {
    throw new Error(
      `Hono Markdown requires ${legacy ? "its public /markdown/compiler API" : "@ts-76/hono-markdown/compiler"} and Markdown peers installed in the app.`,
      { cause },
    );
  }
  const read = compiler.readMarkdownModule ?? compiler.readStaticMarkdown;
  const compile = compiler.compileMarkdownModule ?? compiler.compileStaticMarkdown;
  if (typeof read !== "function" || typeof compile !== "function") throw new Error("Missing standalone compiler API");
  const runtime = entry.startsWith("void-plugin")
    ? "void-plugin-hono-jsx/markdown/client"
    : "@ts-76/hono-markdown/client";
  return {
    read,
    compile: (source, input) => compile(source, { ...input, options }),
    client: (islands) => emitMarkdownClient(islands, runtime),
  };
}
export function createMarkdownAdapter({ cwd, options }: { cwd: string; options?: Record<string, unknown> }) {
  return createHonoMarkdownAdapter(cwd, false, options);
}
function emitMarkdownClient(islands: MarkdownIsland[], runtime: string): string {
  if (!islands.length) return "";
  const literal = (value: string) => JSON.stringify(value).replace(/</g, "\\u003c");
  const isVoid = runtime.startsWith("void-plugin-hono-jsx/");
  const contextModule = isVoid ? "void-plugin-hono-jsx/markdown" : "@ts-76/hono-markdown";
  const scheduler = isVoid ? "void/pages-client" : "@ts-76/hono-markdown/client";
  const schedulerName = isVoid ? "scheduleHydration" : "scheduleMarkdownIsland";
  return `import { hydrateMarkdownIslands } from ${literal(runtime)};
import { ${schedulerName} as scheduleIsland } from ${literal(scheduler)};
import { MarkdownContext } from ${literal(contextModule)};
import { jsx as liveJsx } from "hono/jsx/dom/jsx-runtime";
import { flushSync as flushLiveSync, useState as useLiveState } from "hono/jsx/dom";
function hydrateDeckMarkdownIslands() {
hydrateMarkdownIslands({ ${islands.map((island) => `${literal(island.id)}: () => import(${literal(island.modulePath)})`).join(",")} }, {
  schedule(element, loader, props, strategy, mount) {
    return scheduleIsland(element, loader, props, strategy, (target, module, initialProps) => {
      const live = window.__honoDecksLive;
      if (!live || !module || typeof module.default !== 'function') return mount(target, module, initialProps);
      const Component = module.default;
      function LiveMarkdownIsland(componentProps) {
        const [current, setCurrent] = useLiveState({
          props: componentProps,
          context: JSON.parse(element.closest('[data-hono-md-context]')?.getAttribute('data-hono-md-context') || '{}'),
        });
        const [active, setActive] = useLiveState(true);
        live.register(element, setCurrent, () => flushLiveSync(() => setActive(false)));
        return active ? liveJsx(MarkdownContext.Provider, {
          value: current.context,
          children: liveJsx(Component, current.props),
        }) : null;
      }
      return mount(target, { ...module, default: LiveMarkdownIsland }, initialProps);
    });
  },
  ready(element, start) {
    const slide = element.closest('section[data-slide-state]');
    if (!slide || slide.dataset.slideState === 'active') { start(); return; }
    const observer = new MutationObserver(() => {
      if (slide.dataset.slideState === 'active') { observer.disconnect(); start(); }
    });
    observer.observe(slide, { attributes: true, attributeFilter: ['data-slide-state'] });
  }
});
}
hydrateDeckMarkdownIslands();
if (window.__honoDecksLive) window.__honoDecksLive.registerHydrator(hydrateDeckMarkdownIslands);`;
}

export type { DeckMarkdownAdapter, MarkdownIsland } from "../node/markdown-adapter";
