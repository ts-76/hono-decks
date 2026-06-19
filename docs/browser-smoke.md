# Browser Smoke Checks

`@hono/decks` keeps most contracts under unit tests, but viewport framing and visual overflow still need a real browser pass. The basic example includes a smoke script that starts `wrangler dev`, opens Chromium with `agent-browser`, and captures screenshots.

Run from the repository root:

```bash
bun run smoke:viewport
```

Or from the example:

```bash
bun run --cwd examples/basic smoke:viewport
```

The script checks:

- desktop `1280x800` and mobile `390x844` viewports
- `sample`, `code`, `media`, and `motion` deck viewer pages
- generated render routes contain the internal fixed `1920x1080` deck surface and fit script
- parent iframe follows the 16:9 viewport without fixed `width` / `height` attributes
- keyboard navigation advances the sample deck
- pointer swipe dispatch advances the sample deck
- default viewer control contrast is at least `4.5:1`
- screenshots are written to `HONO_DECKS_SMOKE_ARTIFACTS` or the OS temp directory

Prerequisites:

- `agent-browser` must be installed and able to launch Chromium.
- `wrangler dev` must be able to bind to `127.0.0.1`.

The script intentionally stores screenshots outside the repository by default. Set `HONO_DECKS_SMOKE_ARTIFACTS=/path/to/output` when you want to keep them for review.
