import { createClient } from "honox/client";

void createClient();

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

document.addEventListener("click", async (event) => {
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

  const button = target?.closest<HTMLButtonElement>("[data-copy]");
  if (!button) return;

  const targetId = button.dataset.copy;
  const copyTarget = targetId ? document.getElementById(targetId) : null;
  const status = button.querySelector<HTMLElement>("[data-copy-status]");
  if (!copyTarget || !status) return;

  const idleLabel = status.dataset.idle ?? status.textContent ?? "Copy";
  try {
    const value = copyTarget.dataset.source ?? copyTarget.textContent ?? "";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = value;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      if (!copied) throw new Error("Copy command was rejected");
    }
    status.textContent = status.dataset.success ?? "Copied";
  } catch {
    status.textContent = status.dataset.error ?? "Copy failed";
  }

  window.setTimeout(() => {
    status.textContent = idleLabel;
  }, 1800);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openTrigger = document.querySelector<HTMLButtonElement>("[data-disclosure-trigger][aria-expanded='true']");
  if (!openTrigger) return;
  closeDisclosures();
  openTrigger.focus();
});
