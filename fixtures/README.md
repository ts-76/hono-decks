# Standalone init consumers

These fixtures are existing apps before hono-decks initialization. They are not
workspace members. Install the built hono-decks tarball, then run
`hono-decks init --framework hono` in `hono-vite`, or `--framework honox` in
`honox-vite`. Existing scripts, pages, middleware, and MDX author files are kept.
Use the ordinary `npm run dev` and `npm run build` commands.

After building the package, run `node scripts/verify-vite-init.mjs` from the
repository root with Node 24.21.0. It copies and installs both apps in temporary
directories, checks cold build and cold dev without manual compile, typechecks,
and tests dev and the built Node server in Chromium. Typechecking also runs
before the first build. Virtual modules work without a generated output directory. It checks existing pages,
API routes, middleware, access rejection, MDX, components, assets, sample decks,
desktop/mobile viewer frames, navigation, and edit/add/remove updates. Both apps import mountPath from a separate settings file; the verifier changes
that file alone to /talks/archive, checks old routes/assets are gone, and rebuilds
and runs the production server at the new path. HonoX also rejects an overlapping
catch-all when the built application starts. Route composition is supplied by
hono-decks/honox rather than copied into generated app code.

The fixtures use a non-root Vite asset base (/dev-assets/). Their existing Hono
dev-server exclusions pass prefixed Vite internals and node_modules to Vite;
HonoX leaves its dev-server base unset so it does not override this asset base.
These host settings are present before init and preserved by it. Chromium checks
the injected development client URL, its successful response, and real reloads.
The consumers, screenshots, server logs, and `evidence.json` are retained.
Playwright Chromium must be installed. No deployment is performed.

The pinned host versions are Hono 4.13.13, HonoX 0.1.59, Vite 8.3.4,
`@hono/vite-build` 1.11.1, and `@hono/vite-dev-server` 0.26.1.
The Void consumer has additional adapter prerequisites; see
`void-markdown/README.md` and `scripts/verify-void-markdown.mjs`.
