/** @jsxImportSource hono/jsx */
import { useId } from "hono/jsx";
import type { PropsWithChildren } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
// Pure initialization lets Island imports of TabPanel drop unrelated CSS definitions.
const calloutStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-callout {
        --hx-callout-accent: var(--docs-info);
        margin-block: var(--docs-block-gap);
        padding: var(--docs-panel-padding);
        border: 1px solid var(--hx-callout-accent, CanvasText);
        border-radius: var(--docs-radius);
        background: color-mix(in srgb, var(--hx-callout-accent) 12%, var(--docs-panel, Canvas));
        color: var(--docs-text, CanvasText);
      }
      .hx-callout-info {
        --hx-callout-accent: var(--docs-info);
      }
      .hx-callout-tip {
        --hx-callout-accent: var(--docs-tip);
      }
      .hx-callout-warning {
        --hx-callout-accent: var(--docs-warning);
      }
      .hx-callout-danger {
        --hx-callout-accent: var(--docs-danger);
      }
      .hx-callout-title {
        margin: 0 0 var(--docs-title-gap);
        color: var(--hx-callout-accent, CanvasText);
        font-weight: var(--docs-weight-heading);
      }
      .hx-callout-content > :first-child {
        margin-block-start: 0;
      }
      .hx-callout-content > :last-child {
        margin-block-end: 0;
      }
      @media (forced-colors: active) {
        .hx-callout {
          border-color: CanvasText;
        }
      }
    }
  }
`)();

const cardsStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--docs-space-md);
        margin-block: var(--docs-block-gap);
      }
      .hx-cards-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      @media (max-width: 760px) {
        .hx-cards,
        .hx-cards-3 {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    }
  }
`)();

const cardStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-card-content > :first-child {
        margin-block-start: 0;
      }
      .hx-card-content > :last-child {
        margin-block-end: 0;
      }
      .hx-card {
        min-width: 0;
        padding: var(--docs-panel-padding);
        border: 1px solid var(--docs-line, CanvasText);
        border-radius: var(--docs-radius);
        background: var(--docs-panel, Canvas);
        color: var(--docs-text, CanvasText);
      }
      .hx-card-title {
        margin: 0 0 var(--docs-title-gap);
        font-size: var(--docs-title-size);
        line-height: var(--docs-leading-ui);
        font-weight: var(--docs-weight-heading);
      }
      .hx-card-title a {
        color: inherit;
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.16em;
      }
      .hx-card-content {
        color: var(--docs-muted, CanvasText);
      }
      .hx-card:has(.hx-card-title a:focus-visible) {
        border-color: var(--docs-accent, LinkText);
      }
      .hx-card-title a:focus-visible {
        outline: var(--docs-focus-width) solid var(--docs-accent, LinkText);
        outline-offset: var(--docs-focus-offset);
      }
      @media (hover: hover) {
        .hx-card-title a:hover {
          color: var(--docs-accent, LinkText);
        }
      }
      @media (forced-colors: active) {
        .hx-card {
          border-color: CanvasText;
        }
        .hx-card-title a:focus-visible {
          outline-color: Highlight;
        }
      }
    }
  }
`)();

const stepsStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-steps {
        display: grid;
        gap: var(--docs-block-gap);
        margin-block: var(--docs-block-gap);
        padding: 0;
        list-style: none;
        counter-reset: hx-step;
      }
    }
  }
`)();

const stepStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-step-content > :first-child {
        margin-block-start: 0;
      }
      .hx-step-content > :last-child {
        margin-block-end: 0;
      }
      .hx-step-title {
        margin: 0 0 var(--docs-title-gap);
        font-size: var(--docs-title-size);
        line-height: var(--docs-leading-ui);
        font-weight: var(--docs-weight-heading);
      }
      .hx-step {
        position: relative;
        min-width: 0;
        padding-inline-start: 3rem;
        padding-block-start: 0.125rem;
        counter-increment: hx-step;
      }
      .hx-step::before {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        display: grid;
        width: 2rem;
        aspect-ratio: 1;
        place-items: center;
        border: 1px solid var(--docs-line, CanvasText);
        border-radius: 50%;
        background: var(--docs-tint, Canvas);
        color: var(--docs-accent, LinkText);
        content: counter(hx-step);
        font-size: var(--docs-ui-size);
        font-weight: var(--docs-weight-heading);
        font-variant-numeric: tabular-nums;
      }
    }
  }
`)();

const accordionStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-accordion {
        display: grid;
        gap: var(--docs-space-sm);
        margin-block: var(--docs-block-gap);
      }
    }
  }
`)();

const accordionItemStyles = /* @__PURE__ */ (() => css`
  :-hono-global {
    @layer documentation {
      .hx-accordion-content > :first-child {
        margin-block-start: 0;
      }
      .hx-accordion-content > :last-child {
        margin-block-end: 0;
      }
      .hx-accordion-item {
        border: 1px solid var(--docs-line, CanvasText);
        border-radius: var(--docs-radius);
        background: var(--docs-panel, Canvas);
        color: var(--docs-text, CanvasText);
      }
      .hx-accordion-summary {
        padding: var(--docs-disclosure-padding) var(--docs-panel-padding);
        border-radius: var(--docs-radius);
        cursor: pointer;
        font-size: var(--docs-text-md);
        line-height: var(--docs-leading-ui);
        font-weight: var(--docs-weight-heading);
        overflow-wrap: anywhere;
      }
      .hx-accordion-summary::marker {
        color: var(--docs-accent, LinkText);
      }
      .hx-accordion-item[open] > .hx-accordion-summary {
        border-block-end: 1px solid var(--docs-line, CanvasText);
        border-radius: var(--docs-radius) var(--docs-radius) 0 0;
        background: var(--docs-surface, Canvas);
      }
      .hx-accordion-content {
        padding: var(--docs-panel-padding);
      }
      .hx-accordion-summary:focus-visible {
        outline: var(--docs-focus-width) solid var(--docs-accent, LinkText);
        outline-offset: var(--docs-focus-offset);
      }
      .hx-accordion-summary:focus-visible {
        outline-offset: -4px;
      }
      @media (hover: hover) {
        .hx-accordion-summary:hover {
          background: var(--docs-surface, Canvas);
          color: var(--docs-accent, LinkText);
        }
      }
      .hx-accordion-item > .hx-accordion-summary:active {
        background: var(--docs-tint, Canvas);
        color: var(--docs-accent, LinkText);
      }
      @media (forced-colors: active) {
        .hx-accordion-item {
          border-color: CanvasText;
        }
        .hx-accordion-summary:focus-visible {
          outline-color: Highlight;
        }
      }
    }
  }
`)();

export type CalloutType = "info" | "tip" | "warning" | "danger";

/** A semantic, styled note for documentation content. */
export function Callout({ type = "info", title, children }: PropsWithChildren<{ type?: CalloutType; title?: string }>) {
  return (
    <aside class={html`${calloutStyles}hx-callout hx-callout-${type}`} data-callout-type={type}>
      {title ? <p class="hx-callout-title">{title}</p> : null}
      <div class="hx-callout-content">{children}</div>
    </aside>
  );
}

/** A responsive grid for related cards. */
export function Cards({ columns = 2, children }: PropsWithChildren<{ columns?: 2 | 3 }>) {
  return <div class={html`${cardsStyles}hx-cards hx-cards-${columns}`}>{children}</div>;
}

/** A content card, optionally linked as a whole. */
export function Card({ title, href, children }: PropsWithChildren<{ title: string; href?: string }>) {
  return (
    <article class={html`${cardStyles}hx-card`}>
      <h3 class="hx-card-title">{href ? <a href={href}>{title}</a> : title}</h3>
      {children ? <div class="hx-card-content">{children}</div> : null}
    </article>
  );
}

/** An ordered list styled as a numbered sequence. */
export function Steps({ children }: PropsWithChildren) {
  return <ol class={html`${stepsStyles}hx-steps`}>{children}</ol>;
}

/** One item in a Steps list. */
export function Step({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <li class={html`${stepStyles}hx-step`}>
      {title ? <h3 class="hx-step-title">{title}</h3> : null}
      {children ? <div class="hx-step-content">{children}</div> : null}
    </li>
  );
}

/** A group of native disclosure elements. Each item works without JavaScript. */
export function Accordion({ children }: PropsWithChildren) {
  return <div class={html`${accordionStyles}hx-accordion`}>{children}</div>;
}

/** One native details/summary disclosure within an Accordion. */
export function AccordionItem({ title, open = false, children }: PropsWithChildren<{ title: string; open?: boolean }>) {
  return (
    <details class={html`${accordionItemStyles}hx-accordion-item`} open={open}>
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
