export const VIEWER_STATE_MESSAGE_TYPE = "hono-decks:state";
export const VIEWER_COMMAND_MESSAGE_TYPE = "hono-decks:command";

export function renderViewerScript(): string {
  return `<script>
(() => {
  const root = document.querySelector("[data-hono-decks-viewer]");
  const viewport = document.querySelector("[data-viewer-viewport]");
  const iframe = document.querySelector("iframe");
  const position = document.querySelector("[data-slide-position]");
  let pointerStartX = null;
  let pointerStartY = null;

  function sendCommand(action, index) {
    iframe?.contentWindow?.postMessage({ type: ${JSON.stringify(VIEWER_COMMAND_MESSAGE_TYPE)}, action, index }, "*");
  }

  function viewerClick(event) {
    const target = event.target;
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
    const bounds = viewport?.getBoundingClientRect();
    if (!bounds) return;
    const action = event.clientX < bounds.left + bounds.width / 2 ? "previous" : "next";
    sendCommand(action);
  }

  function viewerPointerDown(event) {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  }

  function viewerPointerUp(event) {
    if (pointerStartX === null || pointerStartY === null) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    pointerStartX = null;
    pointerStartY = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    sendCommand(deltaX < 0 ? "next" : "previous");
  }

  async function toggleViewerFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    await root?.requestFullscreen?.();
  }

  function writeViewerPaginationState(message) {
    if (!Number.isInteger(message.index)) return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set("slide", String(message.index + 1));
    params.set("step", String(Number.isInteger(message.stepIndex) ? message.stepIndex : 0));
    window.history.replaceState(null, "", url);
  }

  document.querySelectorAll("[data-action='previous']").forEach((control) => {
    control.addEventListener("click", () => sendCommand("previous"));
  });
  document.querySelectorAll("[data-action='next']").forEach((control) => {
    control.addEventListener("click", () => sendCommand("next"));
  });
  document.querySelectorAll("[data-action='fullscreen']").forEach((control) => {
    control.addEventListener("click", () => { void toggleViewerFullscreen(); });
  });
  document.querySelectorAll("[data-action='goTo']").forEach((control) => {
    control.addEventListener("click", () => {
      const index = Number(control.getAttribute("data-slide-index"));
      if (Number.isFinite(index)) iframe?.contentWindow?.postMessage({ type: ${JSON.stringify(VIEWER_COMMAND_MESSAGE_TYPE)}, action: "goTo", index }, "*");
    });
  });
  viewport?.addEventListener("click", viewerClick);
  viewport?.addEventListener("pointerdown", viewerPointerDown);
  viewport?.addEventListener("pointerup", viewerPointerUp);
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== ${JSON.stringify(VIEWER_STATE_MESSAGE_TYPE)}) return;
    writeViewerPaginationState(message);
    root?.setAttribute("data-step-index", String(message.stepIndex ?? 0));
    root?.setAttribute("data-step-count", String(message.stepCount ?? 0));
    if (position) {
      const slideText = String(message.index + 1) + " / " + String(message.slideCount ?? "?");
      position.textContent = slideText;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") sendCommand("next");
    if (event.key === "ArrowLeft") sendCommand("previous");
    if (event.key === "f") void toggleViewerFullscreen();
  });
})();
  </script>`;
}
