# Multi-deck file-based routing design

## Summary

Hono Slides will support multiple MDX-based decks through file-based slug routing. The default sample app mounts the router at `/decks`, but the library API follows the user's mount point, so `/slides/deck1` or `/deck1` are also valid if the consumer chooses those routes.

The architecture is Hono-first hybrid. Hono owns routing, rendering, presentation UI, development editor UI, preview update events, and Cloudflare Agent chat routes. Node is used only as a local filesystem I/O adapter for development: discovering deck files, reading and writing raw `.mdx`, reading local deck assets, and watching file changes.

## Goals

- Serve deployed decks as presentation-only pages at slug routes.
- Provide local-only editing, save, preview, and agent chat during development.
- Support development hot reload without moving rendering or preview behavior into Node.
- Support both directory decks and single-file decks.
- Support deck-level and slide-level frontmatter.
- Compile MDX during build/dev rather than at request time.
- Keep production runtime compatible with Hono on Cloudflare Workers.

## Non-goals

- Runtime MDX compilation on deployed Workers.
- Production editing or production filesystem writes.
- PDF export, remote control, or share/QR tooling in the first implementation.
- Arbitrary route overrides as the canonical slug source.

## File Layout And Slugs

The file-based source supports two deck shapes:

```text
decks/
  deck1/
    deck.mdx
    assets/
      image.png
  deck2.mdx
```

`decks/deck1/deck.mdx` maps to slug `deck1`.

`decks/deck2.mdx` maps to slug `deck2`.

If both `decks/deck1.mdx` and `decks/deck1/deck.mdx` exist, compilation fails with a slug conflict error. One slug maps to exactly one source file.

Directory decks expose local assets from `decks/<slug>/assets/*` at `<mount>/<slug>/assets/*`.

Single-file decks do not get implicit sibling asset resolution. They must use remote URLs, R2/public URLs, or absolute public paths. A single-file deck that references local relative assets such as `./image.png` produces a compile error.

The canonical slug comes from the file path. The initial implementation omits a `route` frontmatter key. A future `route` key can be added only as an alias, not as the canonical identity.

## Route Surface

With the sample app mounted at `/decks`:

```text
GET  /decks
GET  /decks/:slug
GET  /decks/:slug/assets/*
GET  /decks/:slug/edit              dev only
POST /decks/:slug/save              dev only
GET  /decks/:slug/events            dev only
POST /decks/:slug/agent/chat        dev only by default
```

Production serves presentation pages only. It does not expose editor UI or save APIs.

Development exposes editor UI, save, preview updates, and Cloudflare Agent chat when `dev` resolves to enabled. The router supports `dev: "auto"` plus explicit `dev: true` and `dev: false` overrides.

## Presentation Tools

The production presentation page includes:

- Previous and next controls
- Current slide position
- Fullscreen
- Keyboard navigation
- Presenter mode
- Speaker notes
- Timer
- Overview

Presenter mode is implemented as an in-page mode. Speaker notes can be present in the HTML, but they are hidden from the default audience view and exposed only when presenter mode is active.

## Frontmatter

Deck-level and slide-level frontmatter are both supported.

The parser supports scalar values, inline arrays, multiline lists, shallow objects, and `|` block text. It is intentionally lightweight rather than a full YAML implementation.

Deck-level known keys:

- `title`
- `description`
- `author`
- `tags`
- `date`
- `theme`
- `draft`
- `assets`
- `presenter`

Slide-level known keys:

- `title`
- `layout`
- `class`
- `notes`
- `background`
- `transition`

Known keys get typed fields. Unknown keys are preserved in `meta` for future themes, agents, and plugins.

## MDX Compilation

MDX is compiled during build or development preview, not per production request.

The first implementation uses a hybrid compile target:

- Markdown content becomes HTML or a stable renderable AST.
- MDX components become typed placeholders.
- Frontmatter becomes typed metadata plus preserved unknown metadata.
- Assets become explicit references in the compiled contract.
- Local asset references in rendered Markdown, slide backgrounds, and MDX component placeholder asset props are rewritten to public asset URLs at render time.

This keeps runtime rendering lightweight and safe while leaving room for future real component execution or theme-driven component rendering.

## Runtime Contracts

`DeckSource` is a production/runtime source of compiled data:

```ts
interface DeckSource {
  listDecks(c: Context): Promise<DeckEntry[]>;
  getCompiledDeck(c: Context, slug: string): Promise<CompiledDeck | null>;
  getAsset?(c: Context, slug: string, assetPath: string): Promise<Response | null>;
}
```

`LocalDeckIO` is a development-only raw file I/O adapter:

```ts
interface LocalDeckIO {
  listFiles(): Promise<DeckFileEntry[]>;
  readMarkdown(slug: string): Promise<string | null>;
  writeMarkdown(slug: string, markdown: string): Promise<void>;
  watch?(onFileChange: (event: DeckFileChange) => void): () => void;
}
```

`DeckCompiler` turns raw MDX into the compiled runtime contract:

```ts
interface DeckCompiler {
  compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck>;
}
```

The compiled manifest is a runtime contract, not just a file list:

```ts
interface CompiledDeck {
  slug: string;
  sourcePath: string;
  kind: "directory" | "single-file";
  meta: DeckFrontmatter;
  slides: CompiledSlide[];
  assets: AssetRef[];
  warnings: CompileWarning[];
}

interface CompiledSlide {
  index: number;
  meta: SlideFrontmatter;
  html: string;
  components: ComponentPlaceholder[];
  notes?: string;
}

interface ComponentPlaceholder {
  id: string;
  name: string;
  props: Record<string, unknown>;
  source: string;
}

interface AssetRef {
  sourcePath: string;
  publicPath: string;
  type: "local" | "remote" | "r2" | "public";
}
```

## Build And Loader Strategy

The standard path is build manifest generation:

```ts
compileDecks({
  root: "decks",
  out: "src/generated/hono-slides-manifest.ts",
});
```

The generated manifest can be wrapped by `manifestDeckSource(manifest)`.

Consumers can replace this with a custom `DeckSource` for D1, KV, R2, GitHub, or CMS-backed decks.

## Development Data Flow

Editor save flow:

1. The editor sends raw MDX to the Hono save route.
2. Hono calls `LocalDeckIO.writeMarkdown(slug, markdown)`.
3. The local I/O adapter writes only the raw `.mdx`.
4. Hono forwards a synthetic `DeckFileChange` to the development runtime when the router is configured with `onFileChange`.
5. If no direct hook is configured, the file watcher emits the raw file event.
6. Hono handles the file event, calls `DeckCompiler`, updates the in-memory compiled deck, and emits a preview event.

Hot reload event ownership:

- Node emits raw file events only.
- Hono owns compilation and preview events.
- The browser editor updates the preview without losing editor state.
- The presentation page uses a full page reload in development.

## Cloudflare Agent Chat

Agent chat is routed through Hono and powered by Cloudflare Agents. Node does not own chat behavior.

The default Agent instance name is derived from `deckSlug + sessionId` to avoid mixing histories across users editing the same deck. Optional deck-level memory can be stored separately from per-session chat state.

Agent requests include:

- deck slug
- session id
- active slide
- current raw MDX
- compiled deck summary when useful
- user instruction/message

The Agent is allowed to edit the slide deck by producing a structured proposal, patch set, or replacement draft. It does not directly persist edits. Saving always goes through the Hono save route and `LocalDeckIO`.

Workers AI Code Mode can be used inside the Agent for multi-step editing workflows. Code Mode is for orchestration, not persistence. It can compose read, inspect, compile, validate, and patch-generation tools when an edit needs loops, conditionals, or multiple tool calls.

Code Mode tools:

- `readDeck`
- `getCompiledDeck`
- `compileMarkdown`
- `inspectSlides`
- `createPatch`
- `validatePatch`

Code Mode does not receive a direct filesystem write tool. User-approved changes are sent back to Hono as a patch set or raw MDX update, then persisted through the save route.

Simple chat tasks can use normal Agent tool calling. Code Mode is reserved for deck-wide or multi-step edits, such as updating frontmatter and notes across several slides, validating the resulting compile output, or repairing asset references after inspection.

## Error Handling

Build/dev compile errors:

- `deck1.mdx` and `deck1/deck.mdx` slug conflict
- frontmatter parse failure
- MDX compile failure
- unsupported local relative assets in single-file decks

Runtime 404:

- unknown slug
- missing directory-deck asset

Warnings:

- unknown frontmatter key
- unsupported MDX component placeholder
- remote/R2 asset existence cannot be verified
- route alias conflicts, if aliases are added later

## Testing

Initial test coverage includes:

- Slug resolution for directory decks and single-file decks.
- Slug conflict errors.
- Deck-level and slide-level frontmatter parsing.
- Markdown to HTML/AST compilation.
- MDX component placeholder extraction.
- Single-file deck relative asset errors.
- Hono router mount-point behavior.
- Production route surface excluding editor/save routes.
- Development route surface including editor/save/agent/events routes.
- `dev: "auto"`, `dev: true`, and `dev: false`.
- `LocalDeckIO.writeMarkdown()` saving raw MDX only.
- File event to Hono compile to preview event flow.
- Cloudflare Agent instance naming from `deckSlug + sessionId`.
