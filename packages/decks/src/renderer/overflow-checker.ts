import { documentNonceAttribute } from "../server/document";

export const OVERFLOW_MESSAGES = {
  label: "Slide overflow warnings",
  canvas: "content overflows the canvas",
  clipped: "content is clipped",
  slide: "Slide",
};

type Rect = { left: number; right: number; top: number; bottom: number };

/** Convert viewport differences to canvas pixels; ignore subpixel rounding. */
export function overflowEdges(rect: Rect, canvas: Rect, scaleX: number, scaleY: number): Record<string, number> {
  const edges: Record<string, number> = {};
  for (const [name, distance] of Object.entries({
    left: (canvas.left - rect.left) / scaleX,
    right: (rect.right - canvas.right) / scaleX,
    top: (canvas.top - rect.top) / scaleY,
    bottom: (rect.bottom - canvas.bottom) / scaleY,
  })) {
    if (distance > 1) edges[name] = Math.ceil(distance);
  }
  return edges;
}

export function clippedOverflow(scroll: number, client: number, overflow: string): boolean {
  return (overflow === "hidden" || overflow === "clip") && client > 0 && scroll - client > 1;
}

/** Separate from the presentation runtime so development diagnostics never ship in page HTML in production. */
export function renderOverflowChecker(nonce?: string): string {
  return `<style${documentNonceAttribute(nonce)} data-hono-decks-overflow-style>
.hono-decks-overflow-outline{outline:4px solid var(--hono-decks-overflow-color,#ef4444);outline-offset:-4px}
.hono-decks-overflow-warnings{position:fixed;top:12px;left:12px;z-index:101;max-width:min(440px,calc(100vw - 24px));max-height:40vh;overflow:auto;padding:10px 12px;border-radius:8px;background:var(--hono-decks-warning-background,#fef3c7);color:var(--hono-decks-warning-color,#854d0e);font:14px/1.45 sans-serif;box-shadow:0 2px 12px #0003}
.hono-decks-overflow-warnings p{margin:0}.hono-decks-overflow-warnings p+p{margin-top:.5em}@media print{.hono-decks-overflow-warnings{display:none}.hono-decks-overflow-outline{outline:none}}
</style><script${documentNonceAttribute(nonce)} data-hono-decks-overflow-checker>
(() => {
  const messages = ${JSON.stringify(OVERFLOW_MESSAGES)};
  const overflowEdges = ${overflowEdges.toString()};
  const clippedOverflow = ${clippedOverflow.toString()};
  const panel = document.createElement("aside");
  panel.className = "hono-decks-overflow-warnings";
  panel.setAttribute("aria-label", messages.label);
  panel.hidden = true;
  document.body.append(panel);
  const logged = new WeakMap();
  let frame = 0;
  let observed = null;
  const resizeObserver = new ResizeObserver(schedule);
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(check);
  }
  function check() {
    frame = 0;
    document.querySelectorAll(".hono-decks-overflow-outline").forEach(el => el.classList.remove("hono-decks-overflow-outline"));
    panel.replaceChildren();
    const slide = document.querySelector('.slide[data-slide-state="active"]');
    if (!slide) { panel.hidden = true; return; }
    const content = slide.querySelector(":scope > .hono-decks-slide-content");
    if (!content) return;
    if (observed !== content) { resizeObserver.disconnect(); resizeObserver.observe(content); observed = content; }
    const canvas = slide.getBoundingClientRect();
    const scaleX = canvas.width / slide.offsetWidth;
    const scaleY = canvas.height / slide.offsetHeight;
    if (!scaleX || !scaleY) return;
    const number = Number(slide.getAttribute("data-slide-index")) + 1;
    function report(el, description) {
      el.classList.add("hono-decks-overflow-outline");
      const message = messages.slide + " " + number + ": " + description;
      const p = document.createElement("p"); p.textContent = message; panel.append(p);
      let seen = logged.get(el); if (!seen) { seen = new Set(); logged.set(el, seen); }
      if (!seen.has(message)) { seen.add(message); console.warn("[hono-decks] " + message, el); }
    }
    // Text nodes have no rectangle of their own. Check the content scroll extent
    // against the canvas, unless an opted-out subtree could contribute to it.
    if (!content.querySelector("[data-hono-decks-allow-overflow], [aria-hidden='true']")) {
      const bounds = content.getBoundingClientRect();
      const extent = { left: bounds.left, top: bounds.top, right: bounds.left + content.scrollWidth * scaleX, bottom: bounds.top + content.scrollHeight * scaleY };
      for (const [edge, amount] of Object.entries(overflowEdges(extent, canvas, scaleX, scaleY))) report(content, messages.canvas + " by " + amount + "px (" + edge + ")");
    }
    const elements = [content, ...content.querySelectorAll("*")];
    elements.forEach(el => {
      if (el.closest("[data-hono-decks-allow-overflow], [aria-hidden='true']")) return;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      if (el !== content) {
        let rect = el.getBoundingClientRect();
        // Intersect with clipping ancestors: a scrollable code block is not canvas overflow.
        for (let parent = el.parentElement; parent && parent !== slide; parent = parent.parentElement) {
          const clip = getComputedStyle(parent);
          const bounds = parent.getBoundingClientRect();
          rect = { left: /hidden|clip|auto|scroll/.test(clip.overflowX) ? Math.max(rect.left, bounds.left) : rect.left, right: /hidden|clip|auto|scroll/.test(clip.overflowX) ? Math.min(rect.right, bounds.right) : rect.right, top: /hidden|clip|auto|scroll/.test(clip.overflowY) ? Math.max(rect.top, bounds.top) : rect.top, bottom: /hidden|clip|auto|scroll/.test(clip.overflowY) ? Math.min(rect.bottom, bounds.bottom) : rect.bottom };
        }
        const edges = overflowEdges(rect, canvas, scaleX, scaleY);
        for (const [edge, amount] of Object.entries(edges)) report(el, messages.canvas + " by " + amount + "px (" + edge + ")");
      }
      if (clippedOverflow(el.scrollWidth, el.clientWidth, style.overflowX) || clippedOverflow(el.scrollHeight, el.clientHeight, style.overflowY)) report(el, messages.clipped);
    });
    panel.hidden = !panel.childElementCount;
  }
  new MutationObserver(schedule).observe(document.querySelector(".hono-decks-deck"), {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["data-slide-state", "hidden", "style", "data-hono-decks-allow-overflow"]});
  window.addEventListener("resize", schedule);
  document.addEventListener("load", schedule, true);
  if (document.fonts) document.fonts.ready.then(schedule);
  schedule();
})();
</script>`;
}
