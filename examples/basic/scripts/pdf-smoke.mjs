#!/usr/bin/env node
import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = path.resolve(import.meta.dirname, "..");
const root = path.resolve(cwd, "../..");
const wranglerBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const port = process.env.HONO_DECKS_PDF_SMOKE_PORT ?? String(19787 + (process.pid % 1000));
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
const session = `hono-decks-pdf-${process.pid}`;
const artifactDir = process.env.HONO_DECKS_PDF_SMOKE_ARTIFACTS ?? path.join(tmpdir(), "hono-decks-pdf-smoke");

const decks = [
  { slug: "sample", pages: 1 },
  { slug: "motion", pages: 1 },
];

let server;
let serverExit;
let serverExited = false;

try {
  await ensureAgentBrowser();
  await run("bun", ["run", "decks:compile"], { cwd });
  server = spawn(wranglerBin, ["dev", "--ip", host, "--port", port], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NO_COLOR: "1" },
  });
  serverExit = new Promise((resolve) => {
    server.once("exit", (code, signal) => {
      serverExited = true;
      resolve({ code, signal });
    });
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`[wrangler] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[wrangler] ${chunk}`));

  await waitForServer(`${baseUrl}/decks/sample/print`);
  await mkdir(artifactDir, { recursive: true });
  await agent(["--session", session, "close"], { allowFailure: true });

  for (const deck of decks) {
    await runPdfCheck(deck);
  }

  console.log(`PDF smoke checks passed. PDFs and previews: ${artifactDir}`);
} finally {
  await agent(["--session", session, "close"], { allowFailure: true });
  if (server && !serverExited) {
    server.kill("SIGTERM");
    await serverExit;
  }
}

async function runPdfCheck(deck) {
  const pdfPath = path.join(artifactDir, `${deck.slug}.pdf`);
  await agent(["--session", session, "open", `${baseUrl}/decks/${deck.slug}/print`]);
  await agent(["--session", session, "wait", "500"]);
  await agent(["--session", session, "pdf", pdfPath]);

  const file = await stat(pdfPath);
  if (file.size < 10_000) {
    throw new Error(`${deck.slug} PDF is unexpectedly small: ${file.size} bytes`);
  }

  const content = await readFile(pdfPath, "latin1");
  const pageCount = (content.match(/\/Type\s*\/Page\b/g) ?? []).length;
  if (pageCount !== deck.pages) {
    throw new Error(`${deck.slug} PDF has ${pageCount} pages; expected ${deck.pages}`);
  }

  const preview = await renderPdfPreview(deck, pdfPath);

  console.log(
    `${deck.slug} PDF: ok (${pageCount} pages, ${file.size} bytes, preview ${preview.width}x${preview.height})`,
  );
}

async function renderPdfPreview(deck, pdfPath) {
  const renderer = await findPdfRenderer();
  if (!renderer) {
    throw new Error(
      "No PDF renderer found. Install Poppler (`pdftoppm`) or run on macOS with Quick Look (`qlmanage`) to enable visual PDF smoke checks.",
    );
  }

  const previewDir = path.join(artifactDir, "previews", deck.slug);
  await rm(previewDir, { recursive: true, force: true });
  await mkdir(previewDir, { recursive: true });

  let previewPath;
  if (renderer === "pdftoppm") {
    const prefix = path.join(previewDir, deck.slug);
    await run("pdftoppm", ["-png", "-singlefile", "-r", "120", pdfPath, prefix], { raw: true });
    previewPath = `${prefix}.png`;
  } else {
    await run("qlmanage", ["-t", "-s", "1440", "-o", previewDir, pdfPath], { raw: true });
    previewPath = await findQuickLookPreview(previewDir);
  }

  const previewFile = await stat(previewPath);
  if (previewFile.size < 5_000) {
    throw new Error(`${deck.slug} PDF preview is unexpectedly small: ${previewFile.size} bytes`);
  }

  const { width, height } = await readPngSize(previewPath);
  if (width < 500 || height < 700) {
    throw new Error(`${deck.slug} PDF preview is unexpectedly small: ${width}x${height}`);
  }
  if (height <= width) {
    throw new Error(`${deck.slug} PDF preview should be A4 portrait, got ${width}x${height}`);
  }

  return { path: previewPath, width, height };
}

async function findPdfRenderer() {
  if (await commandExists("pdftoppm")) return "pdftoppm";
  if (await commandExists("qlmanage")) return "qlmanage";
  return undefined;
}

async function commandExists(command) {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    try {
      await access(path.join(directory, command), constants.X_OK);
      return true;
    } catch {
      // Try the next PATH entry.
    }
  }
  return false;
}

async function findQuickLookPreview(previewDir) {
  const names = await readdir(previewDir);
  const png = names.find((name) => name.endsWith(".png"));
  if (!png) {
    throw new Error(`Quick Look did not generate a PNG preview in ${previewDir}`);
  }
  return path.join(previewDir, png);
}

async function readPngSize(filePath) {
  const header = await readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (header.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${filePath} is not a PNG file`);
  }
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  };
}

async function ensureAgentBrowser() {
  await run("agent-browser", ["--version"]);
}

async function waitForServer(url) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < 30000) {
    if (serverExited) {
      const exit = await serverExit;
      throw new Error(`wrangler dev exited before serving ${url}: ${JSON.stringify(exit)}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`);
}

async function agent(args, options = {}) {
  return run("agent-browser", args, options);
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!options.raw) process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (!options.raw) process.stderr.write(chunk);
  });
  const code = await new Promise((resolve) => child.once("exit", resolve));
  if (code !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`);
  }
  return stdout.trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
