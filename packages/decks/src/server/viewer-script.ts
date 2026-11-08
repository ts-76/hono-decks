export const VIEWER_STATE_MESSAGE_TYPE = "hono-decks:state";
export const VIEWER_KEY_MESSAGE_TYPE = "hono-decks:key";
export const VIEWER_COMMAND_MESSAGE_TYPE = "hono-decks:command";

export function renderViewerScript(nonce?: string): string {
  const nonceAttribute = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  return `<script data-hono-decks-viewer-runtime${nonceAttribute}>
(() => {
  const roots = Array.from(document.querySelectorAll("[data-hono-decks-viewer]"));
  const runtime = window.__honoDecksViewerRuntime ??= { controllers: new Map(), globalInitialized: false };
  const controllers = runtime.controllers;

  for (const root of roots) {
    if (root.hasAttribute("data-hono-decks-initialized")) continue;
    root.setAttribute("data-hono-decks-initialized", "true");

    const viewport = root.querySelector("[data-viewer-viewport]");
    const iframe = root.querySelector("iframe");
    const frameOrigin = iframe?.src ? new URL(iframe.src, window.location.href).origin : window.location.origin;
    const position = root.querySelector("[data-slide-position]");
    const viewerLinks = Array.from(root.querySelectorAll("[data-hono-decks-viewer-link]"));
    const overviewLinks = Array.from(root.querySelectorAll("[data-hono-decks-overview-link]"));
    const panel = root.querySelector("[data-hono-decks-toc-panel]");
    const tocButton = root.querySelector("[data-action='toc']");
    const help = root.querySelector("[data-hono-decks-help]");
    const pendingOutput = root.querySelector("[data-hono-decks-pending-number]");
    const overviewPath = root.getAttribute("data-hono-decks-overview-path");
    const autoHideDelay = Number(root.getAttribute("data-hono-decks-autohide"));
    let currentIndex = 0, slideCount = 1, pending = "", hideTimer, tocRestoreFocus, helpRestoreFocus, pointerOverStage = false;

    const positionText = position?.querySelector(".hono-decks-progress-text") ?? position;

    function writeProgress(index, slideCount) {
      if (!position || !Number.isInteger(index)) return;
      const total = Number.isInteger(slideCount) && slideCount > 0 ? slideCount : Number(position.getAttribute("aria-valuemax")) || 1;
      const current = Math.min(Math.max(index + 1, 1), total);
      position.setAttribute("aria-valuenow", String(current));
      position.setAttribute("aria-valuemax", String(total));
      position.setAttribute("aria-valuetext", "Slide " + current + " of " + total);
      position.style.setProperty("--hono-decks-progress", String(current / total));
      if (positionText) positionText.textContent = current + " / " + total;
    }

    if (position && viewport) viewport.append(position);
    writeProgress(0);

    function sendCommand(action, index) {
      const target = iframe?.contentWindow;
      try {
        const command = target?.__honoDecksPresentationRuntime?.command;
        if (typeof command === "function") {
          command(action, index);
          return;
        }
      } catch {
        // Cross-origin frames cannot expose their runtime. Use postMessage below.
      }
      target?.postMessage({ type: ${JSON.stringify(VIEWER_COMMAND_MESSAGE_TYPE)}, action, index }, frameOrigin);
    }

    function isPortraitMobile() {
      return window.matchMedia("(orientation: portrait) and (pointer: coarse)").matches;
    }

    async function lockViewerLandscape() {
      const orientation = window.screen?.orientation;
      if (!orientation || typeof orientation.lock !== "function") return;
      try {
        await orientation.lock("landscape");
      } catch {
        // Orientation locking is optional; fullscreen remains available when unsupported.
      }
    }

    function unlockViewerOrientation() {
      const orientation = window.screen?.orientation;
      if (!orientation || typeof orientation.unlock !== "function") return;
      orientation.unlock();
    }

    async function toggleViewerFullscreen() {
      if (document.fullscreenElement) {
        unlockViewerOrientation();
        await document.exitFullscreen?.();
        return;
      }
      await root.requestFullscreen?.();
      if (document.fullscreenElement && isPortraitMobile()) await lockViewerLandscape();
    }

    function writeViewerPaginationState(message) {
      if (!Number.isInteger(message.index)) return;
      const url = new URL(window.location.href);
      const params = url.searchParams;
      params.set("slide", String(message.index + 1));
      params.set("step", String(Number.isInteger(message.stepIndex) ? message.stepIndex : 0));
      window.history.replaceState(null, "", url);
      for (const link of viewerLinks) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const viewerUrl = new URL(href, window.location.href);
        viewerUrl.searchParams.set("slide", params.get("slide"));
        viewerUrl.searchParams.set("step", params.get("step"));
        link.setAttribute("href", viewerUrl.href);
      }
      for (const link of overviewLinks) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const overviewUrl = new URL(href, window.location.href);
        overviewUrl.searchParams.set("slide", params.get("slide"));
        link.setAttribute("href", overviewUrl.pathname + overviewUrl.search);
      }
    }

    function handleMessage(event) {
      if (event.source !== iframe?.contentWindow) return;
      if (event.origin !== frameOrigin) return;
      const message = event.data;
      if (!message) return;
      if (message.type === "hono-decks:activity") { if (message.pointer) pointerOverStage = true; activity(); return; }
      if (message.type === ${JSON.stringify(VIEWER_KEY_MESSAGE_TYPE)}) {
        if (document.activeElement !== iframe) return;
        handleKeydown({ ...message, target: iframe, preventDefault() {} });
        return;
      }
      if (message.type !== ${JSON.stringify(VIEWER_STATE_MESSAGE_TYPE)}) return;
      currentIndex = message.index; slideCount = message.slideCount;
      root.querySelectorAll("[data-hono-decks-toc] [data-slide-index]").forEach((button) => {
        if (Number(button.getAttribute("data-slide-index")) === currentIndex) {
          button.setAttribute("aria-current", "true");
          if (panel && !panel.hidden && panel.contains(button)) button.scrollIntoView({ block: "nearest" });
        } else button.removeAttribute("aria-current");
      });
      writeViewerPaginationState(message);
      root.setAttribute("data-step-index", String(message.stepIndex ?? 0));
      root.setAttribute("data-step-count", String(message.stepCount ?? 0));
      writeProgress(message.index, message.slideCount);
    }

    function activity() {
      root.removeAttribute("data-hono-decks-controls-hidden");
      clearTimeout(hideTimer);
      if (!autoHideDelay || !pointerOverStage) return;
      hideTimer = setTimeout(() => {
        const controls = root.querySelector("[data-hono-decks-viewer-controls]");
        if (pointerOverStage && (!panel || panel.hidden) && !help?.open && !controls?.matches(":focus-within") && !root.querySelector(".hono-decks-mobile-navigation:focus") && !document.querySelector(".hono-decks-live:focus-within")) root.setAttribute("data-hono-decks-controls-hidden", "true");
      }, autoHideDelay);
    }
    function toggleToc(open = panel?.hidden) {
      if (!panel) return;
      if (open) { tocRestoreFocus = document.activeElement; panel.hidden = false; tocButton?.setAttribute("aria-expanded", "true"); panel.querySelector("[aria-current], button")?.focus(); }
      else { panel.hidden = true; tocButton?.setAttribute("aria-expanded", "false"); tocRestoreFocus?.focus(); }
      activity();
    }
    function handleKeydown(event) {
      activity();
      if (event.defaultPrevented || help?.open) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input,textarea,select,[role=textbox]"))) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.shiftKey && event.key !== " " && event.key !== "?") return;
      if (target instanceof HTMLElement && target.closest("button,a[href],[role=button],[role=slider]") && event.key === " ") return;
      if (event.key === "Escape") {
        if (panel && !panel.hidden) toggleToc(false);
        pending = ""; if (pendingOutput) pendingOutput.textContent = "";
        return;
      }
      if (/^[0-9]$/.test(event.key)) { pending = (pending + event.key).slice(-6); if (pendingOutput) pendingOutput.textContent = pending; event.preventDefault(); return; }
      if (event.key === "Enter" && pending) { sendCommand("goTo", Math.min(Math.max(Number(pending) - 1, 0), slideCount - 1)); pending = ""; if (pendingOutput) pendingOutput.textContent = ""; event.preventDefault(); return; }
      if (["ArrowRight", "ArrowLeft", " ", "PageDown", "PageUp", "Home", "End"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowRight" || event.key === "PageDown" || (event.key === " " && !event.shiftKey)) sendCommand("next");
      if (event.key === "ArrowLeft" || event.key === "PageUp" || (event.key === " " && event.shiftKey)) sendCommand("previous");
      if (event.key === "Home") sendCommand("goTo", 0);
      if (event.key === "End") sendCommand("goTo", slideCount - 1);
      if (event.key === "f") void toggleViewerFullscreen();
      if (event.key === "t" && panel) toggleToc();
      if (event.key === "o" && overviewPath) { const url = new URL(overviewPath, window.location.href); url.searchParams.set("slide", String(currentIndex + 1)); window.location.assign(url); }
      if (event.key === "?" && help) { helpRestoreFocus = document.activeElement; help.showModal(); }
    }
    viewport?.addEventListener("pointerenter", () => { pointerOverStage = true; activity(); });
    viewport?.addEventListener("pointerleave", () => { pointerOverStage = false; activity(); });
    root.addEventListener("pointermove", activity);
    root.addEventListener("touchstart", activity, { passive: true });
    root.addEventListener("focusin", activity);
    root.addEventListener("focusout", activity);
    root.addEventListener("pointerleave", () => { pointerOverStage = false; activity(); });
    iframe?.addEventListener("load", activity);
    tocButton?.addEventListener("click", () => toggleToc());
    root.querySelector("[data-hono-decks-toc-close]")?.addEventListener("click", () => toggleToc(false));
    root.querySelector("[data-hono-decks-help-close]")?.addEventListener("click", () => help?.close());
    help?.addEventListener("close", () => { helpRestoreFocus?.focus(); activity(); });

    root.querySelectorAll("[data-action='previous']").forEach((control) => {
      control.addEventListener("click", () => sendCommand("previous"));
    });
    root.querySelectorAll("[data-hono-decks-mobile-action='previous']").forEach((control) => {
      control.addEventListener("click", () => sendCommand("previous"));
    });
    root.querySelectorAll("[data-action='next']").forEach((control) => {
      control.addEventListener("click", () => sendCommand("next"));
    });
    root.querySelectorAll("[data-hono-decks-mobile-action='next']").forEach((control) => {
      control.addEventListener("click", () => sendCommand("next"));
    });
    root.querySelectorAll("[data-action='fullscreen']").forEach((control) => {
      control.addEventListener("click", () => { void toggleViewerFullscreen(); });
    });
    root.querySelectorAll("[data-action='goTo']").forEach((control) => {
      control.addEventListener("click", () => {
        const index = Number(control.getAttribute("data-slide-index"));
        if (Number.isFinite(index)) sendCommand("goTo", index);
        if (panel?.contains(control) && window.matchMedia("(max-width: 700px)").matches) toggleToc(false);
      });
    });
    window.addEventListener("message", handleMessage);
    controllers.set(root, { handleKeydown, unlockViewerOrientation });
    activity();
  }

  if (!runtime.globalInitialized) {
    runtime.globalInitialized = true;
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) return;
      controllers.forEach((controller) => controller.unlockViewerOrientation());
    });

    document.addEventListener("keydown", (event) => {
      const activeRoot = document.activeElement?.closest?.("[data-hono-decks-viewer]");
      const onlyRoot = controllers.size === 1 ? controllers.keys().next().value : null;
      controllers.get(activeRoot || onlyRoot)?.handleKeydown(event);
    });
  }
})();
  </script>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
