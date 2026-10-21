# Void Hono Markdown consumer

This standalone fixture uses real package tarballs. It is not a workspace member.
It requires Node 24.21.0 and `void-plugin-hono-jsx@^0.6.0` with its standalone
compiler and client exports. By default, verification lets init install the
published adapter. No registry publication is performed by verification.

From the hono-decks repository, after building hono-decks:

```sh
node scripts/verify-void-markdown.mjs
```

The verifier installs the hono-decks tarball and the fixture's pinned dependencies into a
temporary directory, runs `init --framework void --install`, verifies the generated
`^0.6.0` adapter dependency, then cold `npm run build`
and cold `npm run dev` without a preceding compile, and checks dev/preview in Chromium.
It starts with missing Markdown dependencies, verifies automatic installation, and tests all four island policies, independent state, context, CSS, and component edits. It also runs separate CLI failure/rollback checks. A non-root Vite asset base
checks development-client loading and reloads. Changing an imported mount-path
settings file during dev switches Markdown and MDX routes and their asset URLs,
then restores the mount before preview.
It retains that consumer and its evidence.json for inspection. Install Chromium
with Playwright if it is not already available. This does not deploy to Cloudflare.

To test a local adapter instead, set
`VOID_HONO_PACKAGE=/absolute/path/to/void-plugin-hono-jsx.tgz`; the verifier then
passes `--adapter <tarball>` explicitly.

For manual authoring, copy this fixture to an empty directory and install the
local package tarballs with `npm install /path/decks.tgz /path/adapter.tgz`.
Run `npx hono-decks init --framework void`, then `npm run dev` and open
`/slides/welcome` or `/slides/demo`. `npm run build` also generates slides.
No package script edits or manual compilation are needed. Vite uses in-memory
modules through `virtual:hono-decks`; no generated source directory is created.

## Build and runtime ownership

`build.markdown: "void"` enables both `name.md` and `name/deck.md`, alongside the
existing MDX files. Duplicate slugs across formats fail instead of silently winning.
`honoDecks()` watches the deck directory, recompiles, and reloads the browser.
The CLI uses the same setting and retains its physical file output. Ordinary MDX builds do not load the optional adapter.

Void hosts the Hono router using its public `defineMiddleware` API. The middleware
mounts the complete `/slides` subtree, including images, client scripts and iframe
requests. Custom SSR alone is insufficient: Void processes those requests before
calling `defineRender`. The fallback SSR entry handles other paths.
hono-decks owns its viewer, slide navigation, presenter, print and assets routes.
The adapter owns Markdown parsing, static component emission, highlighting and
copy behavior. There is no `@void/md/plugin` or `voidHonoMarkdown()` Pages plugin
in this app: slide compilation uses the standalone compiler API at build time.
Generated slides use the `void-md` scope. The initialized middleware imports
`theme-content.css` with Vite `?inline` and supplies it through the router's
document-head hook. In development it includes Vite's dev client for reloads.
Customize that app-owned middleware to add app CSS if needed.

## Authoring contract

Put the optional `<script>` block first, then deck YAML frontmatter. Static default
imports are shared by all slides. Separate slides with `---`; per-slide frontmatter
follows the existing deck format. Separators inside fenced code remain code.
Use `notes:` for speaker notes. MDX comment notes and MDX expressions are not
part of `.md` authoring; existing `.mdx` decks retain their current compiler.

Use `:::component Name` for Markdown children, or `<Name />` for a static leaf.
The component receives merged deck/slide frontmatter and that slide's headings
through `useFrontmatter()` / `useMarkdownHeadings()`. Structured props belong in
TSX wrappers. Parser/highlighter code is build-only. Generated code imports only
the adapter's Markdown context at runtime, plus authored static components.

Page islands, arbitrary script-block code, and hono-decks `client.tsx` component
registrations on `.md` decks fail with an explicit error. These need a document
lifecycle integration; use MDX for existing hono-decks client components.
Raw HTML is trusted author content, not sanitized. This is a syntax constraint,
not a sandbox for untrusted Markdown or TSX.
