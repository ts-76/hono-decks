export const VIEWER_STATE_MESSAGE_TYPE = "hono-decks:state";
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
    const printPath = root.getAttribute("data-hono-decks-print-path") || "";

    if (position && viewport) viewport.append(position);

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
    }

    function handleMessage(event) {
      if (event.source !== iframe?.contentWindow) return;
      if (event.origin !== frameOrigin) return;
      const message = event.data;
      if (!message || message.type !== ${JSON.stringify(VIEWER_STATE_MESSAGE_TYPE)}) return;
      writeViewerPaginationState(message);
      root.setAttribute("data-step-index", String(message.stepIndex ?? 0));
      root.setAttribute("data-step-count", String(message.stepCount ?? 0));
      if (position) {
        const slideText = String(message.index + 1) + " / " + String(message.slideCount ?? "?");
        position.textContent = slideText;
      }
    }

    function handleKeydown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p" && printPath) {
        event.preventDefault();
        const printUrl = new URL(printPath, window.location.href);
        printUrl.searchParams.set("autoprint", "1");
        window.location.assign(printUrl);
        return;
      }
      if (event.key === "ArrowRight" || event.key === " ") sendCommand("next");
      if (event.key === "ArrowLeft") sendCommand("previous");
      if (event.key === "f") void toggleViewerFullscreen();
    }

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
      });
    });
    window.addEventListener("message", handleMessage);
    controllers.set(root, { handleKeydown, unlockViewerOrientation });
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
