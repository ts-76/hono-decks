import { createClient } from "honox/client";

createClient();

document.addEventListener("click", async (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-copy]");
  if (!button) return;

  const targetId = button.dataset.copy;
  const target = targetId ? document.getElementById(targetId) : null;
  const status = button.querySelector<HTMLElement>("[data-copy-status]");
  if (!target || !status) return;

  const idleLabel = status.dataset.idle ?? status.textContent ?? "Copy";
  try {
    const value = target.textContent ?? "";
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
