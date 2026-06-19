# PDF Smoke Checks

The basic example includes a print-to-PDF smoke script for the generated render pages. It starts `wrangler dev`, opens render pages with `agent-browser`, saves PDFs, and checks that the generated PDF uses the A4 portrait handout layout.

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
- print output uses A4 portrait pages with margins
- up to 3 slides are placed on each printed page
- `sample` exports 1 handout page for 3 slides
- `motion` exports 1 handout page for 2 slides
- the generated PDF files are non-empty and large enough to catch blank output
- PDFs are written to `HONO_DECKS_PDF_SMOKE_ARTIFACTS` or the OS temp directory

Prerequisites:

- `agent-browser` must be installed and able to launch Chromium.
- `wrangler dev` must be able to bind to `127.0.0.1`.

This is a smoke check, not a visual approval step. For release verification, render the generated PDFs to images with Poppler or another PDF renderer and inspect page framing, text clipping, image rendering, and code block readability.
