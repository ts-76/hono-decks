import { describe, expect, it } from "vitest";
import type { CompiledDeck, DeckFileChange, LocalDeckIO } from "../src/deck";
import { createDevDeckRuntime } from "../src/dev-runtime";
import { createPreviewEventHub } from "../src/preview-events";

const initialDeck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Before", meta: {} },
  slides: [{ index: 0, meta: { title: "Before", meta: {} }, html: "<h1>Before</h1>", components: [] }],
  assets: [],
  warnings: [],
} satisfies CompiledDeck;

describe("createDevDeckRuntime", () => {
  it("updates the mutable source and publishes a preview event after file changes compile", async () => {
    const previewEvents = createPreviewEventHub();
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO({ deck1: "# After" }),
      compiler: {
        async compileMarkdown(input) {
          return {
            ...initialDeck,
            meta: { title: input.markdown.replace("# ", ""), meta: {} },
            slides: [{ ...initialDeck.slides[0], html: `<h1>${input.markdown.replace("# ", "")}</h1>` }],
          };
        },
      },
      previewEvents,
    });

    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      meta: { title: "After" },
      slides: [{ html: "<h1>After</h1>" }],
    });
    expect(previewEvents.drain("deck1")).toEqual([
      {
        type: "deck:updated",
        slug: "deck1",
        data: { source: "watch", path: "decks/deck1/deck.mdx" },
      },
    ]);
  });

  it("serves local assets from the mutable source", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [
        {
          ...initialDeck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/image.png",
              publicPath: "/decks/deck1/assets/image.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1, 2, 3]),
            },
          ],
        },
      ],
      localDeckIO: createMemoryDeckIO({ deck1: "# Before" }),
      compiler: {
        async compileMarkdown() {
          return initialDeck;
        },
      },
    });

    const response = await runtime.source.getAsset?.({} as never, "deck1", "image.png");

    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("image/png");
    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });

  it("refreshes an existing local asset body after an asset file change", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [
        {
          ...initialDeck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/image.png",
              publicPath: "/decks/deck1/assets/image.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1]),
            },
          ],
        },
      ],
      localDeckIO: createMemoryDeckIO(
        { deck1: "# Before" },
        undefined,
        { "decks/deck1/assets/image.png": new Uint8Array([4, 5, 6]) },
      ),
      compiler: {
        async compileMarkdown() {
          throw new Error("asset changes should not recompile markdown");
        },
      },
    });

    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/assets/image.png", slug: "deck1" });
    const response = await runtime.source.getAsset?.({} as never, "deck1", "image.png");

    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([4, 5, 6]).buffer);
  });

  it("adds a new local asset after an asset file create event", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO(
        { deck1: "# Before" },
        undefined,
        { "decks/deck1/assets/new image.svg": new Uint8Array([7, 8, 9]) },
      ),
      compiler: {
        async compileMarkdown() {
          throw new Error("asset creates should not recompile markdown");
        },
      },
    });

    await runtime.handleFileChange({ type: "created", path: "decks/deck1/assets/new image.svg", slug: "deck1" });

    const response = await runtime.source.getAsset?.({} as never, "deck1", "new%20image.svg");
    expect(response?.headers.get("content-type")).toBe("image/svg+xml");
    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([7, 8, 9]).buffer);
    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      assets: [
        {
          sourcePath: "decks/deck1/assets/new image.svg",
          publicPath: "/decks/deck1/assets/new%20image.svg",
          type: "local",
          contentType: "image/svg+xml",
        },
      ],
    });
  });

  it("uses the configured mount path for new local asset public paths", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO(
        { deck1: "# Before" },
        undefined,
        { "decks/deck1/assets/new.png": new Uint8Array([1]) },
      ),
      compiler: {
        async compileMarkdown() {
          throw new Error("asset creates should not recompile markdown");
        },
      },
      mountPath: "/slides",
    });

    await runtime.handleFileChange({ type: "created", path: "decks/deck1/assets/new.png", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      assets: [
        {
          sourcePath: "decks/deck1/assets/new.png",
          publicPath: "/slides/deck1/assets/new.png",
          type: "local",
        },
      ],
    });
  });

  it("removes an existing local asset after an asset file delete", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [
        {
          ...initialDeck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/image.png",
              publicPath: "/decks/deck1/assets/image.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1]),
            },
          ],
        },
      ],
      localDeckIO: createMemoryDeckIO({ deck1: "# Before" }),
      compiler: {
        async compileMarkdown() {
          throw new Error("asset deletes should not recompile markdown");
        },
      },
    });

    await runtime.handleFileChange({ type: "deleted", path: "decks/deck1/assets/image.png", slug: "deck1" });

    await expect(runtime.source.getAsset?.({} as never, "deck1", "image.png")).resolves.toBeNull();
  });


  it("keeps the previous compiled deck and publishes an error event when compile fails", async () => {
    const previewEvents = createPreviewEventHub();
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO({ deck1: "# Broken" }),
      compiler: {
        async compileMarkdown() {
          throw new Error("compile failed");
        },
      },
      previewEvents,
    });

    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toEqual(initialDeck);
    expect(previewEvents.drain("deck1")).toEqual([
      {
        type: "deck:error",
        slug: "deck1",
        data: { message: "compile failed", path: "decks/deck1/deck.mdx" },
      },
    ]);
  });

  it("removes a deck after a deck source delete event", async () => {
    const previewEvents = createPreviewEventHub();
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO({}),
      compiler: {
        async compileMarkdown() {
          throw new Error("deleted deck should not compile");
        },
      },
      previewEvents,
    });

    await runtime.handleFileChange({ type: "deleted", path: "decks/deck1/deck.mdx", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toBeNull();
    expect(previewEvents.drain("deck1")).toEqual([
      {
        type: "deck:updated",
        slug: "deck1",
        data: { source: "watch", path: "decks/deck1/deck.mdx", deleted: true },
      },
    ]);
  });

  it("does not let a slower older compile overwrite a newer file change", async () => {
    let releaseFirstCompile: (() => void) | undefined;
    const previewEvents = createPreviewEventHub();
    const localDeckIO = createMemoryDeckIO({ deck1: "# First" });
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO,
      compiler: {
        async compileMarkdown(input) {
          if (input.markdown === "# First") {
            await new Promise<void>((resolve) => {
              releaseFirstCompile = resolve;
            });
          }
          return {
            ...initialDeck,
            meta: { title: input.markdown.replace("# ", ""), meta: {} },
          };
        },
      },
      previewEvents,
    });

    const first = runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });
    await waitForAsyncWatchHandler();
    await localDeckIO.writeMarkdown("deck1", "# Second");
    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });
    releaseFirstCompile?.();
    await first;

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      meta: { title: "Second" },
    });
    expect(previewEvents.drain("deck1").filter((event) => event.type === "deck:updated")).toHaveLength(1);
  });

  it("does not discard an in-flight deck compile when an asset changes", async () => {
    let releaseCompile: (() => void) | undefined;
    const runtime = createDevDeckRuntime({
      initialDecks: [
        {
          ...initialDeck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/image.png",
              publicPath: "/decks/deck1/assets/image.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1]),
            },
          ],
        },
      ],
      localDeckIO: createMemoryDeckIO(
        { deck1: "# Source Update" },
        undefined,
        { "decks/deck1/assets/image.png": new Uint8Array([9]) },
      ),
      compiler: {
        async compileMarkdown(input) {
          await new Promise<void>((resolve) => {
            releaseCompile = resolve;
          });
          return {
            ...initialDeck,
            meta: { title: input.markdown.replace("# ", ""), meta: {} },
          };
        },
      },
    });

    const compile = runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });
    await waitForAsyncWatchHandler();
    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/assets/image.png", slug: "deck1" });
    releaseCompile?.();
    await compile;

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      meta: { title: "Source Update" },
    });
    const response = await runtime.source.getAsset?.({} as never, "deck1", "image.png");
    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([9]).buffer);
  });

  it("merges compiled external asset references with existing local asset bodies after source changes", async () => {
    const runtime = createDevDeckRuntime({
      initialDecks: [
        {
          ...initialDeck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/image.png",
              publicPath: "/decks/deck1/assets/image.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1, 2, 3]),
            },
          ],
        },
      ],
      localDeckIO: createMemoryDeckIO({ deck1: "# Source Update" }),
      compiler: {
        async compileMarkdown(input) {
          return {
            ...initialDeck,
            meta: { title: input.markdown.replace("# ", ""), meta: {} },
            assets: [
              {
                sourcePath: "https://cdn.example.com/source-update.png",
                publicPath: "https://cdn.example.com/source-update.png",
                type: "remote",
                contentType: "image/png",
              },
            ],
          };
        },
      },
    });

    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      assets: [
        {
          sourcePath: "decks/deck1/assets/image.png",
          type: "local",
          body: new Uint8Array([1, 2, 3]),
        },
        {
          sourcePath: "https://cdn.example.com/source-update.png",
          type: "remote",
        },
      ],
    });
  });

  it("uses LocalDeckIO file entries when a new single-file deck is created", async () => {
    const previewEvents = createPreviewEventHub();
    const compileInputs: Array<{ sourcePath: string; kind: string }> = [];
    const runtime = createDevDeckRuntime({
      initialDecks: [],
      localDeckIO: {
        async listFiles() {
          return [{ slug: "deck2", sourcePath: "decks/deck2.mdx", kind: "single-file" }];
        },
        async readMarkdown(slug) {
          return slug === "deck2" ? "# Deck Two\n\n![Remote](https://cdn.example.com/deck2.png)" : null;
        },
        async writeMarkdown() {},
      },
      compiler: {
        async compileMarkdown(input) {
          compileInputs.push({ sourcePath: input.sourcePath, kind: input.kind });
          return {
            ...initialDeck,
            slug: input.slug,
            sourcePath: input.sourcePath,
            kind: input.kind,
            meta: { title: input.markdown.replace(/^#\s*/, "").split("\n")[0], meta: {} },
          };
        },
      },
      previewEvents,
    });

    await runtime.handleFileChange({ type: "created", path: "decks/deck2.mdx", slug: "deck2" });

    expect(compileInputs).toEqual([{ sourcePath: "decks/deck2.mdx", kind: "single-file" }]);
    await expect(runtime.source.getCompiledDeck({} as never, "deck2")).resolves.toMatchObject({
      slug: "deck2",
      sourcePath: "decks/deck2.mdx",
      kind: "single-file",
      meta: { title: "Deck Two" },
    });
    expect(previewEvents.drain("deck2")).toEqual([
      {
        type: "deck:updated",
        slug: "deck2",
        data: { source: "watch", path: "decks/deck2.mdx" },
      },
    ]);
  });

  it("publishes an error event when reading raw markdown fails", async () => {
    const previewEvents = createPreviewEventHub();
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: {
        async listFiles() {
          return [];
        },
        async readMarkdown() {
          throw new Error("read failed");
        },
        async writeMarkdown() {},
      },
      compiler: {
        async compileMarkdown() {
          throw new Error("should not compile");
        },
      },
      previewEvents,
    });

    await runtime.handleFileChange({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toEqual(initialDeck);
    expect(previewEvents.drain("deck1")).toEqual([
      {
        type: "deck:error",
        slug: "deck1",
        data: { message: "read failed", path: "decks/deck1/deck.mdx" },
      },
    ]);
  });

  it("subscribes to LocalDeckIO watch and returns the unwatch function", async () => {
    let onFileChange: ((event: DeckFileChange) => void) | undefined;
    let stopped = false;
    const runtime = createDevDeckRuntime({
      initialDecks: [initialDeck],
      localDeckIO: createMemoryDeckIO(
        { deck1: "# Watched" },
        (next) => {
          onFileChange = next;
          return () => {
            stopped = true;
          };
        },
      ),
      compiler: {
        async compileMarkdown(input) {
          return {
            ...initialDeck,
            meta: { title: input.markdown.replace("# ", ""), meta: {} },
          };
        },
      },
    });

    const stop = runtime.start();
    onFileChange?.({ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" });
    await waitForAsyncWatchHandler();
    stop();

    await expect(runtime.source.getCompiledDeck({} as never, "deck1")).resolves.toMatchObject({
      meta: { title: "Watched" },
    });
    expect(stopped).toBe(true);
  });

  it("exports the dev runtime from the public module", async () => {
    const mod = await import("../src/mod");
    expect(typeof mod.createDevDeckRuntime).toBe("function");
  });
});

function createMemoryDeckIO(
  markdownBySlug: Record<string, string>,
  watch?: (onFileChange: (event: DeckFileChange) => void) => () => void,
  assetsByPath: Record<string, Uint8Array> = {},
): LocalDeckIO {
  return {
    async listFiles() {
      return Object.keys(markdownBySlug).map((slug) => ({
        slug,
        sourcePath: `decks/${slug}/deck.mdx`,
        kind: "directory",
      }));
    },
    async readMarkdown(slug) {
      return markdownBySlug[slug] ?? null;
    },
    async writeMarkdown(slug, markdown) {
      markdownBySlug[slug] = markdown;
    },
    async readAsset(path) {
      return assetsByPath[path] ?? null;
    },
    watch,
  };
}

async function waitForAsyncWatchHandler(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
