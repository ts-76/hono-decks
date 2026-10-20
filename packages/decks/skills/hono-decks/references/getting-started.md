# Getting started

Use this route for installation, initialization, a first deck, or a failed initial compile.

## Inspect before changing

Identify the package manager, application entry point, Hono environment type, build tool, Wrangler config format, and existing Vite plugins. Preserve the application's established structure and scripts.

## Install and initialize

For an existing Hono + Vite app, use `npx hono-decks init --framework hono`.
For HonoX, use `npx hono-decks init --framework honox`. Both preserve package
scripts and Vite options, add virtual compilation and routing, and create a sample MDX
deck at `/slides/welcome`. Use normal `dev`/`build` without manual compile.
Hono accepts `--entry path/to/app.ts` if the conventional entry is ambiguous;
it expects a default-exported `const app = new Hono()`, and refuses conflicting
earlier routes. HonoX wraps the existing createApp options and adds a route using its public
ROUTES API. It preserves existing middleware and follows mountPath without a
physical route directory. Neither needs the Void adapter. Follow the README for supported
shapes and non-destructive fallbacks. The generic init below remains available
for manual integration and non-Vite applications.

For an existing Void app, use `npx hono-decks init --framework void` after
installing the compatible packages and Markdown peers described in the README.
Use `void-plugin-hono-jsx@^0.4.0` for its standalone compiler and client exports. Init connects the existing Vite config, creates the routing
middleware and a sample `.md` deck at `/slides/welcome`, and uses virtual modules without generated
files. Use the app's normal `dev` and `build` scripts without changes or a manual
compile. Existing `.mdx` files remain supported. Unsupported configs or existing
integration files cause a non-destructive error. The generic Hono flow follows.

```bash
bun add hono hono-decks
bunx hono-decks init
```

`init` creates these files without overwriting existing files:

- `hono-decks.config.ts`: shared build and runtime configuration
- `src/decks.ts`: editable facade around generated modules

Use the equivalent `npm`, `pnpm`, or Yarn commands when the repository does not use Bun.

## Vite runtime entry

Framework init uses `virtual:hono-decks` with `/// <reference types="hono-decks/vite-env" />`.
It exports a configured `decks` kit and `createDecks(config)`. Vite dev/build keep
compiled modules in memory; do not add manual compile scripts, physical generated
imports, outDir, or ignore rules. Typechecking works before dev/build. Explicit
OGP data caches retain disk persistence. The generic CLI/file workflow follows.

## Configure once

```ts
// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
});
```

```ts
// src/decks.ts
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
```

Create `decks/welcome/deck.mdx`:

```mdx
---
title: Welcome
description: My first hono-decks presentation
---

---
layout: cover
---

# Welcome

MDX slides served by Hono.

---
layout: default
---

## Build-time compilation

- Author in `decks/`
- Compile to `src/generated/`
- Serve generated modules from Hono
```

Compile and mount it:

```bash
bunx hono-decks compile
```

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();

app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());

export default app;
```

## Add compilation to development

For a Wrangler Worker, use the existing JSONC config:

```jsonc
{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
```

For Vite or HonoX, add the plugin to the existing plugin array:

```ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

## Diagnose setup failures

- Missing config: run `hono-decks init` or create a default-exported `hono-decks.config.ts`.
- Missing virtual module types: reference `hono-decks/vite-env`; a dev/build or manual compile is not required for typechecking.
- Missing generated import in the CLI/file workflow: run `hono-decks compile` before typechecking the application.
- Deck not discovered: use `decks/<slug>/deck.mdx` or a supported single-file deck in the configured root.
- Broken routes or assets: remove duplicated strings and use `decks.mountPath` and `decks.paths(slug)`.
- Worker bundling Node modules: import `hono-decks/node` only from build scripts, never from Worker runtime code.
- Lost edits after compile: move changes out of `src/generated` and into source decks or configuration.


For an existing Void app, `init --framework void --install` installs missing
Markdown dependencies using the app's package manager before creating integration
files. Use `--adapter /absolute/path/adapter.tgz` for a pre-release compiler API;
retain manual dependency installation by omitting --install. Yarn PnP is not
supported by the automatic installer. The generated Markdown sample includes a
Counter.tsx island. Markdown uses relative default imports with `island: "load"`,
`visible`, `idle`, or `media:(query)` and literal props, with no separate registry.
Arbitrary script code/JSX expressions remain unsupported; MDX stays unchanged.
