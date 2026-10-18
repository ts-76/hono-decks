/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const definitionListStyles = css`
  :-hono-global {
    @layer documentation {
      .hx-definition-list {
        margin: var(--docs-block-gap) 0;
      }
      .hx-definition-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: var(--docs-space-4);
        padding: var(--docs-space-3) 0;
        border-bottom: 1px solid var(--docs-line);
        overflow-wrap: anywhere;
      }
      .hx-definition-row dt {
        font-weight: var(--docs-weight-heading);
      }
      .hx-definition-row dd {
        margin: 0;
        min-width: 0;
      }
      .hx-definition-row dd > :first-child {
        margin-top: 0;
      }
      .hx-definition-row dd > :last-child {
        margin-bottom: 0;
      }
      @media (max-width: 480px) {
        .hx-definition-row {
          grid-template-columns: 1fr;
          gap: var(--docs-space-1);
        }
      }
    }
  }
`;

export type DefinitionItem = { term: Child; description: Child };

export function DefinitionList({ items, label }: { items: readonly DefinitionItem[]; label?: string }) {
  if (!items.length) return null;
  return (
    <dl class={html`${definitionListStyles}hx-definition-list`} aria-label={label}>
      {items.map(({ term, description }) => (
        <div class="hx-definition-row">
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}
