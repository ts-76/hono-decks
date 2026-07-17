# Getting started

Use this route for installation, initialization, a first deck, or a failed initial compile.

## Inspect before changing

Identify the package manager, application entry point, Hono environment type, build tool, Wrangler config format, and existing Vite plugins. Preserve the application's established structure and scripts.

## Install and initialize

```bash
bun add hono hono-decks
bunx hono-decks init
```

`init` creates these files without overwriting existing files:

- `hono-decks.config.ts`: shared build and runtime configuration
- `src/decks.ts`: editable facade around generated modules

Use the equivalent `npm`, `pnpm`, or Yarn commands when the repository does not use Bun.

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
- Missing generated import: run `hono-decks compile` before typechecking the application.
- Deck not discovered: use `decks/<slug>/deck.mdx` or a supported single-file deck in the configured root.
- Broken routes or assets: remove duplicated strings and use `decks.mountPath` and `decks.paths(slug)`.
- Worker bundling Node modules: import `hono-decks/node` only from build scripts, never from Worker runtime code.
- Lost edits after compile: move changes out of `src/generated` and into source decks or configuration.
