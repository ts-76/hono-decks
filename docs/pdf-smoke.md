# PDF Smoke Checks

The basic example includes a print-to-PDF smoke script for the generated print pages. It starts `wrangler dev`, opens `/:slug/print` pages with `agent-browser`, saves PDFs, renders the first PDF page to a PNG preview, and checks that the generated PDF uses the A4 portrait handout layout.

Run from the repository root:

```bash
bun run smoke:pdf
```

Or from the example:

```bash
bun run --cwd examples/basic smoke:pdf
```

The script checks:

- package print CSS is exercised through the real `/decks/:slug/print` document
- print output uses A4 portrait pages with margins
- up to 3 slides are placed on each printed page
- `sample` exports 1 handout page for 3 slides
- `media` exports 2 handout pages for 6 slides
- `motion` exports 1 handout page for 2 slides
- the generated PDF files are non-empty and large enough to catch blank output
- the first PDF page can be rendered to a portrait PNG preview
- PDF files and preview images are written to `HONO_DECKS_PDF_SMOKE_ARTIFACTS` or the OS temp directory

Prerequisites:

- `agent-browser` must be installed and able to launch Chromium.
- `wrangler dev` must be able to bind to `127.0.0.1`.
- A PDF renderer must be available:
  - Poppler `pdftoppm`, or
  - macOS Quick Look `qlmanage`

This is still a smoke check, not a full visual approval step. The generated PNG previews make it easier to inspect page framing, text clipping, image rendering, and code block readability before release.
