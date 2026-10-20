/** @jsxImportSource hono/jsx */
import { useEffect, useId } from "hono/jsx";

function activateTab(button: HTMLButtonElement, index: number) {
  const root = button.closest<HTMLElement>("[data-hx-tabs]");
  if (!root) return;

  const buttons = root.querySelectorAll<HTMLButtonElement>(".hx-tab-list > [role='tab']");
  const panels = root.querySelectorAll<HTMLElement>(".hx-tab-panels > .hx-tab-panel");

  buttons.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = Number(panel.dataset.hxTabPanelIndex) !== index;
  });
}

/**
 * Accessible tab navigation island. Copy to app/islands/tabs.tsx and register
 * its default export as `Tabs` in the application's MDX component map. Import
 * the static TabPanel from app/components/docs-content in MDX.
 */
export default function Tabs({
  labels,
  ariaLabel = "Tabs",
  selectedIndex = 0,
  children,
}: {
  labels: readonly string[];
  ariaLabel?: string;
  selectedIndex?: number;
  children?: import("hono/jsx").Child;
}) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `hx-tabs-${generatedId}`;
  const initialIndex =
    Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < labels.length ? selectedIndex : 0;

  useEffect(() => {
    if (labels.length === 0) return;
    const root = document.querySelector<HTMLElement>(`[data-hx-tabs-id="${id}"]`);
    if (!root) return;

    const buttons = root.querySelectorAll<HTMLButtonElement>(".hx-tab-list > [role='tab']");
    const panels = root.querySelectorAll<HTMLElement>(".hx-tab-panels > .hx-tab-panel");

    buttons.forEach((button) => {
      const index = Number(button.dataset.hxTabIndex);
      const panel = Array.from(panels).find((candidate) => Number(candidate.dataset.hxTabPanelIndex) === index);
      const selected = index === initialIndex;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;

      if (!panel) {
        button.removeAttribute("aria-controls");
        return;
      }

      panel.setAttribute("role", "tabpanel");
      panel.id ||= `${id}-panel-${index}`;
      button.setAttribute("aria-controls", panel.id);
      panel.setAttribute("aria-labelledby", button.id);
      panel.tabIndex = 0;
      panel.hidden = !selected;
    });

    panels.forEach((panel) => {
      const index = Number(panel.dataset.hxTabPanelIndex);
      const hasTab = Number.isInteger(index) && index >= 0 && index < labels.length;
      if (!hasTab) panel.hidden = true;
    });
    root.dataset.hxTabsReady = "true";
  }, [id, initialIndex, labels.length]);

  return (
    <div class="hx-tabs" data-hx-tabs data-hx-tabs-id={id}>
      {labels.length ? (
        <div class="hx-tab-list" role="tablist" aria-label={ariaLabel}>
          {labels.map((label, index) => (
            <button
              id={`${id}-tab-${index}`}
              class="hx-tab"
              type="button"
              role="tab"
              data-hx-tab-index={index}
              aria-selected={index === initialIndex}
              tabIndex={index === initialIndex ? 0 : -1}
              onClick={(event) => activateTab(event.currentTarget as HTMLButtonElement, index)}
              onKeyDown={(event) => {
                let nextIndex: number;
                switch (event.key) {
                  case "ArrowRight":
                    nextIndex = (index + 1) % labels.length;
                    break;
                  case "ArrowLeft":
                    nextIndex = (index - 1 + labels.length) % labels.length;
                    break;
                  case "Home":
                    nextIndex = 0;
                    break;
                  case "End":
                    nextIndex = labels.length - 1;
                    break;
                  default:
                    return;
                }
                event.preventDefault();
                const button = event.currentTarget as HTMLButtonElement;
                activateTab(button, nextIndex);
                button.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']").item(nextIndex)?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div class="hx-tab-panels">{children}</div>
    </div>
  );
}
