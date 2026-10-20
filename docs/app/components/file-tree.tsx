/** @jsxImportSource hono/jsx */
import type { PropsWithChildren } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const fileTreeStyles = css`
  :-hono-global {
    @layer documentation {
      .hx-file-tree {
        margin-block: var(--docs-block-gap);
        border: 1px solid var(--docs-line);
        border-radius: var(--docs-radius);
        background: var(--docs-panel);
        color: var(--docs-text);
        font-size: var(--docs-ui-size);
      }
      .hx-file-tree {
        padding: var(--docs-space-3);
      }
      .hx-file-tree .hx-file-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .hx-folder > .hx-file-list {
        margin-inline-start: var(--docs-space-5);
        padding-inline-start: var(--docs-space-2);
        border-inline-start: 1px solid var(--docs-line);
      }
      .hx-file-tree .hx-file-item {
        margin: 0;
        padding: 0;
      }
      .hx-file-row,
      .hx-folder-summary {
        display: flex;
        align-items: center;
        gap: var(--docs-space-2);
        min-height: 36px;
        padding: var(--docs-space-1) var(--docs-space-2);
        border-radius: var(--docs-control-radius);
        color: inherit;
        line-height: var(--docs-leading-ui);
        overflow-wrap: anywhere;
      }
      .hx-file-row {
        padding-inline-start: var(--docs-space-8);
      }
      .hx-file-row > span,
      .hx-folder-summary > span {
        min-width: 0;
      }
      .hx-file-icon,
      .hx-folder-chevron {
        flex: 0 0 auto;
        color: var(--docs-muted);
      }
      .hx-folder-summary {
        cursor: pointer;
        list-style: none;
        font-weight: var(--docs-weight-ui);
      }
      .hx-folder-summary::-webkit-details-marker {
        display: none;
      }
      .hx-folder[open] > .hx-folder-summary .hx-folder-chevron {
        transform: rotate(90deg);
      }
      .hx-file-tree .hx-file-highlighted {
        background: var(--docs-tint);
        color: var(--docs-accent);
        font-weight: var(--docs-weight-ui);
      }
      .hx-file-highlighted .hx-file-icon {
        color: inherit;
      }
      .hx-folder-summary:focus-visible,
      .hx-file-row:focus-visible {
        outline: var(--docs-focus-width) solid var(--docs-accent);
        outline-offset: -2px;
      }
      @media (hover: hover) {
        .hx-folder-summary:hover,
        .hx-file-tree a.hx-file-row:hover {
          background: var(--docs-surface);
          color: var(--docs-accent);
        }
      }
      .hx-folder-summary:active,
      .hx-file-tree a.hx-file-row:active {
        background: var(--docs-tint);
        color: var(--docs-accent);
      }
      @media (forced-colors: active) {
        .hx-file-highlighted {
          outline: 1px solid Highlight;
          outline-offset: -1px;
        }
        .hx-folder-summary:focus-visible,
        .hx-file-row:focus-visible {
          outline-color: Highlight;
        }
      }
    }
  }
`;

function FileIcon({ folder = false }: { folder?: boolean }) {
  return (
    <svg class="hx-file-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {folder ? (
        <path
          d="M2 4a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z"
          stroke="currentColor"
          stroke-linejoin="round"
        />
      ) : (
        <path d="M4 2h5l3 3v9H4V2Zm5 0v4h3" stroke="currentColor" stroke-linejoin="round" />
      )}
    </svg>
  );
}

/** Nested lists and native disclosures remain usable without JavaScript. */
export function FileTree({ label = "Project files", children }: PropsWithChildren<{ label?: string }>) {
  return (
    <div class={html`${fileTreeStyles}hx-file-tree`} role="group" aria-label={label}>
      <ul class="hx-file-list">{children}</ul>
    </div>
  );
}

export function Folder({ name, open = true, children }: PropsWithChildren<{ name: string; open?: boolean }>) {
  return (
    <li class="hx-file-item">
      <details class="hx-folder" open={open}>
        <summary class="hx-folder-summary">
          <svg class="hx-folder-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="m4 2 4 4-4 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <FileIcon folder />
          <span>{name}</span>
        </summary>
        <ul class="hx-file-list">{children}</ul>
      </details>
    </li>
  );
}

/** highlighted marks a file of interest, without implying navigation selection. */
export function File({ name, href, highlighted = false }: { name: string; href?: string; highlighted?: boolean }) {
  const content = (
    <>
      <FileIcon />
      <span>{name}</span>
    </>
  );
  return (
    <li class="hx-file-item">
      {href ? (
        <a class={`hx-file-row${highlighted ? " hx-file-highlighted" : ""}`} href={href}>
          {content}
        </a>
      ) : (
        <span class={`hx-file-row${highlighted ? " hx-file-highlighted" : ""}`}>{content}</span>
      )}
    </li>
  );
}
