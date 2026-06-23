#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = path.resolve(import.meta.dirname, "..");
const root = path.resolve(cwd, "../..");
const wranglerConfigHome = path.join(cwd, ".wrangler-config");
const wranglerBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const port = process.env.HONO_DECKS_SMOKE_PORT ?? String(18787 + (process.pid % 1000));
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
const session = `hono-decks-viewport-${process.pid}`;
const artifactDir = process.env.HONO_DECKS_SMOKE_ARTIFACTS ?? path.join(tmpdir(), "hono-decks-browser-smoke");

const checks = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];
const deckSlugs = ["sample", "code", "media", "motion"];

let server;
let serverExit;
let serverExited = false;

try {
  await ensureAgentBrowser();
  await run("bun", ["run", "decks:compile"], { cwd });
  server = spawn(wranglerBin, ["dev", "--ip", host, "--port", port], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "1", XDG_CONFIG_HOME: wranglerConfigHome, NO_COLOR: "1" },
  });
  serverExit = new Promise((resolve) => {
    server.once("exit", (code, signal) => {
      serverExited = true;
      resolve({ code, signal });
    });
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`[wrangler] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[wrangler] ${chunk}`));
  await waitForServer(`${baseUrl}/decks/sample`);
  for (const slug of deckSlugs) {
    await assertRenderRoute(slug);
  }

  await mkdir(artifactDir, { recursive: true });
  await agent(["--session", session, "close"], { allowFailure: true });

  for (const check of checks) {
    for (const slug of deckSlugs) {
      await runViewportCheck(check, slug, slug === "sample");
    }
  }

  console.log(`Viewport smoke checks passed. Screenshots: ${artifactDir}`);
} finally {
  await agent(["--session", session, "close"], { allowFailure: true });
  if (server && !serverExited) {
    server.kill("SIGTERM");
    await serverExit;
  }
}

async function runViewportCheck(check, slug, verifyNavigation) {
  const url = `${baseUrl}/decks/${slug}`;
  await agent(["--session", session, "open", url]);
  await agent(["--session", session, "set", "viewport", String(check.width), String(check.height)]);
  await sleep(500);

  const viewport = await evalJson(viewportMetricsScript());
  assertSmoke(viewport, `${check.name} ${slug} viewport`);

  if (verifyNavigation) {
    await agent(["--session", session, "press", "ArrowRight"]);
    const keyboard = await waitForPosition("2 / ");
    if (!keyboard.position.startsWith("2 / ")) {
      throw new Error(`${check.name} keyboard navigation did not advance: ${keyboard.position}`);
    }

    const bounds = await evalJson(boundsScript());
    await evalJson(dispatchSwipeScript(bounds));
    const swipe = await waitForPosition("3 / ");
    if (!swipe.position.startsWith("3 / ")) {
      throw new Error(`${check.name} swipe navigation did not advance: ${swipe.position}`);
    }
  }

  if (slug === "motion") {
    await verifyMotionFragmentSteps(check.name);
  }

  await agent(["--session", session, "screenshot", path.join(artifactDir, `${check.name}-${slug}-viewer.png`)]);
}

async function verifyMotionFragmentSteps(label) {
  const initial = await waitForMotionState(
    (state) =>
      state.position === "1 / 3" &&
      state.stepIndex === "0" &&
      state.stepCount === "1" &&
      state.hiddenFragments === 1 &&
      state.activeTransitions === 0,
    `${label} motion initial fragment state`,
  );
  assertSlideOnlyPosition(initial.position, `${label} motion initial position`);

  await evalJson(clickNextControlScript());
  const firstReveal = await waitForMotionState(
    (state) =>
      state.position === "1 / 3" &&
      state.stepIndex === "1" &&
      state.stepCount === "1" &&
      state.visibleFragments === 1 &&
      state.activeTransitions === 0,
    `${label} motion first fragment reveal`,
  );
  assertSlideOnlyPosition(firstReveal.position, `${label} motion first reveal position`);

  await evalJson(clickNextControlScript());
  const secondSlide = await waitForMotionState(
    (state) =>
      state.position === "2 / 3" &&
      state.stepIndex === "0" &&
      Number(state.stepCount) > 0 &&
      state.activeTransitions === 0,
    `${label} motion second slide fragment state`,
  );
  assertSlideOnlyPosition(secondSlide.position, `${label} motion second slide position`);

  await evalJson(clickNextControlScript());
  const secondReveal = await waitForMotionState(
    (state) =>
      state.position === "2 / 3" &&
      state.stepIndex === "1" &&
      state.visibleFragments >= 1 &&
      state.activeTransitions === 0,
    `${label} motion second slide fragment reveal`,
  );
  assertSlideOnlyPosition(secondReveal.position, `${label} motion second reveal position`);

  await evalJson(dispatchMotionGoToScript(0));
  await evalJson(dispatchMotionGoToScript(2));
  const queuedNavigation = await waitForMotionState(
    (state) => state.position === "3 / 3" && state.stepIndex === "0" && state.activeTransitions === 0,
    `${label} motion queued slide navigation`,
  );
  assertSlideOnlyPosition(queuedNavigation.position, `${label} motion queued navigation position`);
}

function viewportMetricsScript() {
  return `(() => {
    const viewport = document.querySelector("[data-viewer-viewport]");
    const iframe = document.querySelector("iframe");
    const controls = document.querySelector("[data-hono-decks-viewer-controls]");
    const errors = [];
    if (!(viewport instanceof HTMLElement)) errors.push("missing viewport");
    if (!(iframe instanceof HTMLIFrameElement)) errors.push("missing iframe");
    if (!(controls instanceof HTMLElement)) errors.push("missing controls");
    if (errors.length) return { ok: false, errors };
    const view = viewport.getBoundingClientRect();
    const frame = iframe.getBoundingClientRect();
    const ratio = view.width / view.height;
    const style = getComputedStyle(viewport);
    if (Math.abs(ratio - 16 / 9) > 0.025) errors.push("viewport ratio is " + ratio.toFixed(3));
    if (view.width > window.innerWidth + 1 || view.height > window.innerHeight + 1) errors.push("viewport overflows window");
    if (Math.abs(frame.width - view.width) > 1 || Math.abs(frame.height - view.height) > 1) errors.push("iframe does not follow viewport size");
    if (iframe.hasAttribute("width") || iframe.hasAttribute("height")) errors.push("iframe has fixed width/height attributes");
    if (!iframe.title) errors.push("iframe title is missing");
    if (style.touchAction !== "pan-y") errors.push("touch-action is " + style.touchAction);
    const contrast = controls ? minControlContrast(controls) : 0;
    if (contrast < 4.5) errors.push("control contrast is " + contrast.toFixed(2));
    return {
      ok: errors.length === 0,
      errors,
      viewport: { width: view.width, height: view.height },
      iframe: { width: frame.width, height: frame.height },
      title: iframe.title,
      controlsText: controls.textContent?.trim(),
      contrast
    };

    function minControlContrast(container) {
      const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
      const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor);
      const pageBg = bodyBg.a > 0 ? bodyBg : rootBg;
      return Array.from(container.querySelectorAll("button")).reduce((min, button) => {
        const styles = getComputedStyle(button);
        const fg = parseColor(styles.color);
        const bg = blend(parseColor(styles.backgroundColor), pageBg);
        return Math.min(min, contrastRatio(fg, bg));
      }, Infinity);
    }

    function parseColor(value) {
      const match = value.match(/rgba?\\(([^)]+)\\)/);
      if (!match) return { r: 0, g: 0, b: 0, a: 1 };
      const parts = match[1].split(",").map((part) => part.trim());
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
        a: parts[3] === undefined ? 1 : Number(parts[3])
      };
    }

    function blend(top, bottom) {
      const a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a
      };
    }

    function contrastRatio(a, b) {
      const lighter = Math.max(luminance(a), luminance(b));
      const darker = Math.min(luminance(a), luminance(b));
      return (lighter + 0.05) / (darker + 0.05);
    }

    function luminance(color) {
      const values = [color.r, color.g, color.b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    }
  })()`;
}

function boundsScript() {
  return `(() => {
    const viewport = document.querySelector("[data-viewer-viewport]");
    if (!(viewport instanceof HTMLElement)) throw new Error("missing viewport");
    const rect = viewport.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  })()`;
}

function dispatchSwipeScript(bounds) {
  const y = Math.round(bounds.top + bounds.height / 2);
  const startX = Math.round(bounds.left + bounds.width * 0.72);
  const endX = Math.round(bounds.left + bounds.width * 0.28);
  return `(() => {
    const viewport = document.querySelector("[data-viewer-viewport]");
    if (!(viewport instanceof HTMLElement)) throw new Error("missing viewport");
    viewport.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: ${startX}, clientY: ${y}, pointerType: "touch" }));
    viewport.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: ${endX}, clientY: ${y}, pointerType: "touch" }));
    return { ok: true };
  })()`;
}

function positionScript() {
  return `(() => {
    const doc = window.top?.document ?? document;
    const position = doc.querySelector("[data-slide-position]");
    return { position: position?.textContent ?? "" };
  })()`;
}

function motionStateScript() {
  return `(() => {
    const doc = window.top?.document ?? document;
    const root = doc.querySelector("[data-hono-decks-viewer]");
    const position = doc.querySelector("[data-slide-position]");
    const iframe = doc.querySelector("iframe");
    const frameDoc = iframe?.contentDocument;
    const activeSlide = frameDoc?.querySelector(".slide:not([hidden])");
    const fragments = Array.from(activeSlide?.querySelectorAll("[data-hono-decks-fragment]") ?? []);
    return {
      position: position?.textContent ?? "",
      stepIndex: root?.getAttribute("data-step-index") ?? "",
      stepCount: root?.getAttribute("data-step-count") ?? "",
      activeTransitions: frameDoc?.querySelectorAll("[data-active-transition]").length ?? 0,
      visibleFragments: fragments.filter((fragment) => !fragment.hasAttribute("data-fragment-hidden")).length,
      hiddenFragments: fragments.filter((fragment) => fragment.hasAttribute("data-fragment-hidden")).length
    };
  })()`;
}

function clickNextControlScript() {
  return `(() => {
    const doc = window.top?.document ?? document;
    const next = doc.querySelector("[data-action='next']");
    if (!(next instanceof HTMLButtonElement)) throw new Error("missing next control");
    next.click();
    return { ok: true };
  })()`;
}

function dispatchMotionGoToScript(index) {
  return `(() => {
    const doc = window.top?.document ?? document;
    const iframe = doc.querySelector("iframe");
    if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) throw new Error("missing deck iframe");
    iframe.contentWindow.postMessage({ type: "hono-decks:command", action: "goTo", index: ${index} }, "*");
    return { ok: true };
  })()`;
}

function assertSmoke(result, label) {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.errors.join("; ")}`);
  }
  console.log(`${label}: ok`);
}

async function waitForPosition(prefix) {
  const startedAt = Date.now();
  let result;
  while (Date.now() - startedAt < 5000) {
    result = await evalJson(positionScript());
    if (result.position.startsWith(prefix)) return result;
    await sleep(200);
  }
  return result;
}

async function waitForMotionState(predicate, label) {
  const startedAt = Date.now();
  let result;
  while (Date.now() - startedAt < 5000) {
    result = await evalJson(motionStateScript());
    if (predicate(result)) return result;
    await sleep(200);
  }
  throw new Error(`${label} failed: ${JSON.stringify(result)}`);
}

function assertSlideOnlyPosition(position, label) {
  if (position.includes("·")) {
    throw new Error(`${label} should not include fragment step text: ${position}`);
  }
}

async function ensureAgentBrowser() {
  await run("agent-browser", ["--version"]);
}

async function assertRenderRoute(slug) {
  const response = await fetch(`${baseUrl}/decks/${slug}/render`);
  const html = await response.text();
  const missing = [];
  if (!response.ok) missing.push(`render route HTTP ${response.status}`);
  if (!html.includes("data-hono-decks-deck")) missing.push("missing rendered deck marker");
  if (!html.includes("function fitDeck()")) missing.push("missing internal deck fit script");
  if (!html.includes("transform-origin:left top")) missing.push("missing left-top transform origin");
  if (missing.length) {
    throw new Error(`${slug} render route check failed: ${missing.join("; ")}`);
  }
  console.log(`${slug} render route: ok`);
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

async function evalJson(script) {
  const output = await agent(["--session", session, "eval", "--json", script], { raw: true });
  const parsed = JSON.parse(output);
  if (!parsed.success) {
    throw new Error(parsed.error?.message ?? "agent-browser eval failed");
  }
  return parsed.data.result;
}

async function agent(args, options = {}) {
  return run("agent-browser", args, options);
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? cwd,
    stdio: options.raw ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
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
