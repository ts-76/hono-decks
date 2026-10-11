import { createClient } from "honox/client";

// Keep discovery in app source: a prebundled honox/client can cache an old file map.
const islandFiles = Object.fromEntries(
  Object.entries({
    ...import.meta.glob("/app/islands/**/*.tsx"),
    ...import.meta.glob("/app/**/*.island.tsx"),
    ...import.meta.glob("/app/**/$*.tsx"),
  }).filter(([file]) =>
    [/\/[a-zA-Z0-9-]+\.tsx$/, /\/_[a-zA-Z0-9-]+\.island\.tsx$/, /\/\$[a-zA-Z0-9-]+\.tsx$/].some((pattern) =>
      pattern.test(file),
    ),
  ),
);

void createClient({ ISLAND_FILES: islandFiles }).then(() => {
  document.documentElement.dataset.islandsReady = "true";
});

function setDisclosure(trigger: HTMLButtonElement, open: boolean) {
  const panelId = trigger.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!panel) return;

  trigger.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  trigger.closest<HTMLElement>("[data-disclosure]")?.toggleAttribute("data-open", open);
}

function closeDisclosures(except?: HTMLButtonElement) {
  document.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger][aria-expanded='true']").forEach((trigger) => {
    if (trigger !== except) setDisclosure(trigger, false);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  const disclosureTrigger = target?.closest<HTMLButtonElement>("[data-disclosure-trigger]");
  if (disclosureTrigger) {
    const nextOpen = disclosureTrigger.getAttribute("aria-expanded") !== "true";
    if (nextOpen) closeDisclosures(disclosureTrigger);
    setDisclosure(disclosureTrigger, nextOpen);
    return;
  }

  const disclosureLink = target?.closest<HTMLAnchorElement>("[data-disclosure-panel] a");
  if (disclosureLink) {
    const disclosure = disclosureLink.closest<HTMLElement>("[data-disclosure]");
    const trigger = disclosure?.querySelector<HTMLButtonElement>("[data-disclosure-trigger]");
    if (trigger) setDisclosure(trigger, false);
  } else if (!target?.closest("[data-disclosure]")) {
    closeDisclosures();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openTrigger = document.querySelector<HTMLButtonElement>("[data-disclosure-trigger][aria-expanded='true']");
  if (!openTrigger) return;
  closeDisclosures();
  openTrigger.focus();
});
