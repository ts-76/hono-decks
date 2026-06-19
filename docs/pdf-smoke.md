# PDF Smoke Checks

The basic example includes a print-to-PDF smoke script for the generated render pages. It starts `wrangler dev`, opens render pages with `agent-browser`, saves PDFs, and checks that the generated PDF contains at least the expected number of slide pages.

Run from the repository root:

```bash
bun run smoke:pdf
```

Or from the example:

```bash
bun run --cwd examples/basic smoke:pdf
```

The script checks:

- package print CSS is exercised through the real `/decks/:slug/render` document
- `sample` exports at least 3 pages
- `motion` exports at least 2 pages
- the generated PDF files are non-empty and large enough to catch blank output
- PDFs are written to `HONO_DECKS_PDF_SMOKE_ARTIFACTS` or the OS temp directory

Prerequisites:

- `agent-browser` must be installed and able to launch Chromium.
- `wrangler dev` must be able to bind to `127.0.0.1`.

This is a smoke check, not a visual approval step. For release verification, render the generated PDFs to images with Poppler or another PDF renderer and inspect page framing, text clipping, image rendering, and code block readability.
