/** @jsxImportSource hono/jsx */
import { useId } from "hono/jsx";
import type { PropsWithChildren } from "hono/jsx";

export type CalloutType = "info" | "tip" | "warning" | "danger";

/** A semantic, styled note for documentation content. */
export function Callout({ type = "info", title, children }: PropsWithChildren<{ type?: CalloutType; title?: string }>) {
  return (
    <aside class={`hx-callout hx-callout-${type}`} data-callout-type={type}>
      {title ? <p class="hx-callout-title">{title}</p> : null}
      <div class="hx-callout-content">{children}</div>
    </aside>
  );
}

/** A responsive grid for related cards. */
export function Cards({ columns = 2, children }: PropsWithChildren<{ columns?: 2 | 3 }>) {
  return <div class={`hx-cards hx-cards-${columns}`}>{children}</div>;
}

/** A content card, optionally linked as a whole. */
export function Card({ title, href, children }: PropsWithChildren<{ title: string; href?: string }>) {
  return (
    <article class="hx-card">
      <h3 class="hx-card-title">{href ? <a href={href}>{title}</a> : title}</h3>
      {children ? <div class="hx-card-content">{children}</div> : null}
    </article>
  );
}

/** An ordered list styled as a numbered sequence. */
export function Steps({ children }: PropsWithChildren) {
  return <ol class="hx-steps">{children}</ol>;
}

/** One item in a Steps list. */
export function Step({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <li class="hx-step">
      {title ? <h3 class="hx-step-title">{title}</h3> : null}
      {children ? <div class="hx-step-content">{children}</div> : null}
    </li>
  );
}

/** A group of native disclosure elements. Each item works without JavaScript. */
export function Accordion({ children }: PropsWithChildren) {
  return <div class="hx-accordion">{children}</div>;
}

/** One native details/summary disclosure within an Accordion. */
export function AccordionItem({ title, open = false, children }: PropsWithChildren<{ title: string; open?: boolean }>) {
  return (
    <details class="hx-accordion-item" open={open}>
      <summary class="hx-accordion-summary">{title}</summary>
      <div class="hx-accordion-content">{children}</div>
    </details>
  );
}

/**
 * Marks a tab's content for Tabs. Place it inside Tabs with a matching index;
 * Tabs supplies the tabpanel wrapper and accessible relationships.
 */
export function TabPanel({ index, children }: PropsWithChildren<{ index: number }>) {
  const panelId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div id={`hx-tab-content-${panelId}`} class="hx-tab-panel" data-hx-tab-panel-index={index}>
      {children}
    </div>
  );
}
