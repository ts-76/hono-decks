export function renderLiveReloadScript(eventsPath: string): string {
  return `<script>
(() => {
  const eventsUrl = ${JSON.stringify(eventsPath)};
  const events = new EventSource(eventsUrl);
  events.addEventListener("deck:updated", () => location.reload());
})();
</script>`;
}

export function renderClientEntryScript(clientEntry: string): string {
  return `<script type="module" src="${escapeHtml(clientEntry)}"></script>`;
}

export function renderPresentationScript(): string {
  return `<script>
(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const stage = document.querySelector("[data-hono-decks-stage]");
  const deck = document.querySelector("[data-hono-decks-deck]");
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  let index = 0;
  let previousIndex = 0;
  let stepIndex = 0;
  let stepCount = 0;
  let isTransitioning = false;
  let pendingNavigation = null;
  let transitionToken = 0;

  function fitDeck() {
    if (!(stage instanceof HTMLElement) || !(deck instanceof HTMLElement)) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT);
    deck.style.transform = "scale(" + scale + ")";
  }

  function publishState() {
    const state = { type: "hono-decks:state", index, stepIndex, stepCount, slideCount: slides.length };
    if (window.parent !== window) window.parent.postMessage(state, "*");
    if (window.opener && window.opener !== window) window.opener.postMessage(state, window.location.origin);
  }

  function slideFragments(slide) {
    return Array.from(slide?.querySelectorAll("[data-hono-decks-fragment]") ?? []).sort((a, b) => fragmentOrder(a, 0) - fragmentOrder(b, 0));
  }

  function fragmentOrder(fragment, fallback) {
    const order = Number(fragment.getAttribute("data-fragment-order"));
    return Number.isFinite(order) && order > 0 ? order : fallback;
  }

  function fragmentCountForSlide(slideIndex) {
    return slideFragments(slides[slideIndex]).length;
  }

  function setFragmentsVisible(fragments, visible) {
    fragments.forEach((fragment) => {
      fragment.toggleAttribute("data-fragment-hidden", !visible);
      fragment.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function updateFragments(nextStepIndex) {
    const fragments = slideFragments(slides[index]);
    stepCount = fragments.length;
    stepIndex = Math.max(0, Math.min(stepCount, nextStepIndex));
    fragments.forEach((fragment, fragmentIndex) => {
      const visible = fragmentOrder(fragment, fragmentIndex + 1) <= stepIndex;
      fragment.toggleAttribute("data-fragment-hidden", !visible);
      fragment.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function activeTransitionTiming(slide) {
    const style = getComputedStyle(slide);
    return {
      duration: style.getPropertyValue("--hono-decks-slide-transition-duration").trim(),
      easing: style.getPropertyValue("--hono-decks-slide-transition-easing").trim(),
    };
  }

  function applyActiveTransitionTiming(slide, timing) {
    if (timing?.duration) {
      slide.style.setProperty("--hono-decks-active-transition-duration", timing.duration);
    } else {
      slide.style.removeProperty("--hono-decks-active-transition-duration");
    }
    if (timing?.easing) {
      slide.style.setProperty("--hono-decks-active-transition-easing", timing.easing);
    } else {
      slide.style.removeProperty("--hono-decks-active-transition-easing");
    }
  }

  function setSlideState(slide, state, direction, transition, timing) {
    if (!slide) return;
    slide.setAttribute("data-slide-state", state);
    if (transition && transition !== "none" && state !== "inactive") {
      slide.setAttribute("data-active-transition", transition);
      applyActiveTransitionTiming(slide, timing);
    } else {
      slide.removeAttribute("data-active-transition");
      applyActiveTransitionTiming(slide);
    }
    if (direction) {
      slide.setAttribute("data-slide-direction", direction);
    } else {
      slide.removeAttribute("data-slide-direction");
    }
    slide.hidden = state === "inactive";
  }

  function transitionForSlide(slide) {
    return slide?.getAttribute("data-transition") || "none";
  }

  function parseCssTime(value) {
    const time = value.trim();
    if (!time) return Number.NaN;
    if (time.endsWith("ms")) return Number.parseFloat(time);
    if (time.endsWith("s")) return Number.parseFloat(time) * 1000;
    return Number.NaN;
  }

  function parseCssTimeList(value) {
    return value.split(",").map(parseCssTime).filter((time) => Number.isFinite(time));
  }

  function listValue(values, index) {
    return values.length ? values[index % values.length] : 0;
  }

  function transitionDurationMs(slide) {
    if (!slide) return 240;
    const style = getComputedStyle(slide);
    const durations = parseCssTimeList(style.transitionDuration);
    const delays = parseCssTimeList(style.transitionDelay);
    const count = Math.max(durations.length, delays.length);
    if (count === 0) return 240;
    let max = 0;
    for (let index = 0; index < count; index += 1) {
      max = Math.max(max, listValue(durations, index) + listValue(delays, index));
    }
    return max;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function queueNavigation(targetIndex, nextStepIndex = 0) {
    pendingNavigation = {
      targetIndex: Math.max(0, Math.min(slides.length - 1, targetIndex)),
      nextStepIndex,
    };
  }

  function drainPendingNavigation() {
    const pending = pendingNavigation;
    pendingNavigation = null;
    if (pending) show(pending.targetIndex, pending.nextStepIndex);
  }

  function applyInstantSlideChange(targetIndex, nextStepIndex = 0, direction) {
    previousIndex = index;
    index = Math.max(0, Math.min(slides.length - 1, targetIndex));
    slides.forEach((slide, slideIndex) => {
      setSlideState(slide, slideIndex === index ? "active" : "inactive", slideIndex === index ? direction : undefined);
    });
    updateFragments(nextStepIndex);
    publishState();
  }

  function finishSlideTransition(outgoing, incoming, direction) {
    setSlideState(outgoing, "inactive");
    setSlideState(incoming, "active", direction);
    isTransitioning = false;
    drainPendingNavigation();
  }

  function isTransitionEndEvent(event, slide) {
    return event.target === slide && (event.propertyName === "opacity" || event.propertyName === "transform" || event.propertyName === "all");
  }

  function waitForSlideTransition(outgoing, incoming, direction, token) {
    let finished = false;
    const watchedSlides = [outgoing, incoming].filter(Boolean);
    const expectedDuration = Math.max(transitionDurationMs(outgoing), transitionDurationMs(incoming));
    const startedAt = performance.now();
    function cleanup() {
      watchedSlides.forEach((slide) => {
        slide.removeEventListener("transitionend", onTransitionEnd);
        slide.removeEventListener("transitioncancel", onTransitionEnd);
      });
      window.clearTimeout(timeout);
    }
    function finish() {
      if (finished || token !== transitionToken) return;
      finished = true;
      cleanup();
      finishSlideTransition(outgoing, incoming, direction);
    }
    function onTransitionEnd(event) {
      if (!watchedSlides.some((slide) => isTransitionEndEvent(event, slide))) return;
      const elapsed = performance.now() - startedAt;
      if (elapsed >= Math.max(expectedDuration - 20, 0)) finish();
    }
    watchedSlides.forEach((slide) => {
      slide.addEventListener("transitionend", onTransitionEnd);
      slide.addEventListener("transitioncancel", onTransitionEnd);
    });
    const timeout = window.setTimeout(finish, expectedDuration + 80);
  }

  function show(nextIndex, nextStepIndex = 0) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    const direction = targetIndex >= index ? "forward" : "backward";
    if (document.body.hasAttribute("data-overview-mode") || targetIndex === index) {
      applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      return;
    }
    if (isTransitioning) {
      queueNavigation(targetIndex, nextStepIndex);
      return;
    }

    const outgoing = slides[index];
    const incoming = slides[targetIndex];
    const transition = transitionForSlide(incoming);
    const timing = activeTransitionTiming(incoming);
    if (transition === "none" || prefersReducedMotion()) {
      applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      return;
    }

    if (transition === "view-transition" && typeof document.startViewTransition === "function") {
      isTransitioning = true;
      const viewTransition = document.startViewTransition(() => {
        applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      });
      Promise.resolve(viewTransition.finished).finally(() => {
        isTransitioning = false;
        drainPendingNavigation();
      });
      return;
    }

    isTransitioning = true;
    const token = ++transitionToken;
    previousIndex = index;
    index = targetIndex;
    slides.forEach((slide) => {
      if (slide !== outgoing && slide !== incoming) setSlideState(slide, "inactive");
    });
    setSlideState(outgoing, "active", direction, transition, timing);
    setSlideState(incoming, "entering", direction, transition, timing);
    updateFragments(nextStepIndex);
    publishState();
    requestAnimationFrame(() => {
      setSlideState(outgoing, "leaving", direction, transition, timing);
      setSlideState(incoming, "active", direction, transition, timing);
      waitForSlideTransition(outgoing, incoming, direction, token);
    });
  }

  function next() {
    if (isTransitioning) {
      queueNavigation(index + 1, 0);
      return;
    }
    if (stepIndex < stepCount) {
      updateFragments(stepIndex + 1);
      publishState();
      return;
    }
    show(index + 1, 0);
  }

  function previous() {
    if (isTransitioning) {
      const targetIndex = Math.max(0, index - 1);
      queueNavigation(targetIndex, fragmentCountForSlide(targetIndex));
      return;
    }
    if (stepIndex > 0) {
      updateFragments(stepIndex - 1);
      publishState();
      return;
    }
    if (index > 0) {
      const previousIndex = index - 1;
      show(previousIndex, fragmentCountForSlide(previousIndex));
      return;
    }
    show(0, 0);
  }

  function toggleOverview() {
    const enabled = document.body.toggleAttribute("data-overview-mode");
    transitionToken += 1;
    isTransitioning = false;
    pendingNavigation = null;
    slides.forEach((slide) => {
      slide.hidden = false;
      slide.setAttribute("data-slide-state", "active");
      slide.removeAttribute("data-slide-direction");
      slide.removeAttribute("data-active-transition");
    });
    setFragmentsVisible(Array.from(document.querySelectorAll("[data-hono-decks-fragment]")), enabled);
    if (!enabled) show(index);
  }

  function togglePresenter() {
    const enabled = document.body.toggleAttribute("data-presenter-mode");
    document.querySelectorAll(".speaker-notes").forEach((note) => { note.hidden = !enabled; });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    await document.documentElement.requestFullscreen?.();
  }

  slides.forEach((slide, slideIndex) => {
    slide.addEventListener("click", () => {
      if (!document.body.hasAttribute("data-overview-mode")) return;
      document.body.removeAttribute("data-overview-mode");
      show(slideIndex);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") next();
    if (event.key === "ArrowLeft") previous();
    if (event.key === "f") void toggleFullscreen();
    if (event.key === "p") togglePresenter();
    if (event.key === "o") toggleOverview();
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-decks:command") return;
    if (message.action === "previous") previous();
    if (message.action === "next") next();
    if (message.action === "goTo" && Number.isInteger(message.index)) show(message.index, Number.isInteger(message.stepIndex) ? message.stepIndex : 0);
    if (message.action === "fullscreen") void toggleFullscreen();
    if (message.action === "presenter") togglePresenter();
    if (message.action === "overview") toggleOverview();
  });

  window.addEventListener("resize", fitDeck);
  fitDeck();
  show(0);
})();
</script>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
