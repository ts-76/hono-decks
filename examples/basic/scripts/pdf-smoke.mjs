#!/usr/bin/env node
import { mkdir, readFile, stat } from "node:fs/promises";
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
  { slug: "sample", minPages: 3 },
  { slug: "motion", minPages: 2 },
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

  await waitForServer(`${baseUrl}/decks/sample/render`);
  await mkdir(artifactDir, { recursive: true });
  await agent(["--session", session, "close"], { allowFailure: true });

  for (const deck of decks) {
    await runPdfCheck(deck);
  }

  console.log(`PDF smoke checks passed. PDFs: ${artifactDir}`);
} finally {
  await agent(["--session", session, "close"], { allowFailure: true });
  if (server && !serverExited) {
    server.kill("SIGTERM");
    await serverExit;
  }
}

async function runPdfCheck(deck) {
  const pdfPath = path.join(artifactDir, `${deck.slug}.pdf`);
  await agent(["--session", session, "open", `${baseUrl}/decks/${deck.slug}/render`]);
  await agent(["--session", session, "wait", "500"]);
  await agent(["--session", session, "pdf", pdfPath]);

  const file = await stat(pdfPath);
  if (file.size < 10_000) {
    throw new Error(`${deck.slug} PDF is unexpectedly small: ${file.size} bytes`);
  }

  const content = await readFile(pdfPath, "latin1");
  const pageCount = (content.match(/\/Type\s*\/Page\b/g) ?? []).length;
  if (pageCount < deck.minPages) {
    throw new Error(`${deck.slug} PDF has ${pageCount} pages; expected at least ${deck.minPages}`);
  }

  console.log(`${deck.slug} PDF: ok (${pageCount} pages, ${file.size} bytes)`);
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
