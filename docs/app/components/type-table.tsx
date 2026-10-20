/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const typeTableStyles = css`
  :-hono-global {
    @layer documentation {
      .hx-type-table {
        margin-block: var(--docs-block-gap);
        border: 1px solid var(--docs-line);
        border-radius: var(--docs-radius);
        background: var(--docs-panel);
        color: var(--docs-text);
        font-size: var(--docs-ui-size);
      }
      .hx-type-table table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
      }
      .hx-type-table caption {
        padding: var(--docs-space-3) var(--docs-panel-padding);
        text-align: start;
        font-weight: var(--docs-weight-heading);
        border-block-end: 1px solid var(--docs-line);
      }
      .hx-type-table th,
      .hx-type-table td {
        padding: var(--docs-space-3) var(--docs-panel-padding);
        border: 0;
        border-block-end: 1px solid var(--docs-line);
        text-align: start;
        vertical-align: top;
        overflow-wrap: anywhere;
      }
      .hx-type-table th:first-child {
        width: 32%;
      }
      .hx-type-table thead {
        background: var(--docs-surface);
        font-size: var(--docs-text-xs);
        color: var(--docs-muted);
      }
      .hx-type-table tbody tr:last-child > * {
        border-block-end: 0;
      }
      .hx-type-table code {
        font-size: var(--docs-code-size);
        background: var(--docs-surface);
        border: 1px solid var(--docs-line);
        border-radius: var(--docs-control-radius);
        padding: var(--docs-inline-code-padding);
        color: var(--docs-text);
        white-space: normal;
      }
      .hx-type-table .hx-property-type {
        color: var(--docs-info);
      }
      .hx-property-status {
        display: block;
        margin-block-start: var(--docs-space-1);
        font-size: var(--docs-text-xs);
        font-weight: var(--docs-weight-body);
        color: var(--docs-muted);
      }
      .hx-property-description {
        margin-block-start: var(--docs-space-2);
      }
      .hx-property-description > :first-child {
        margin-block-start: 0;
      }
      .hx-property-description > :last-child {
        margin-block-end: 0;
      }
      .hx-type-table .hx-property-default {
        margin: var(--docs-space-2) 0 0;
        font-size: var(--docs-text-xs);
        color: var(--docs-muted);
      }
      .hx-type-table-empty {
        margin-block: var(--docs-block-gap);
        color: var(--docs-muted);
      }
      @media (max-width: 760px) {
        .hx-type-table th,
        .hx-type-table td {
          padding-inline: var(--docs-space-3);
        }
      }
      @media (max-width: 480px) {
        .hx-type-table th:first-child {
          width: 8.5rem;
        }
      }
    }
  }
`;

export type TypeProperty = {
  name: string;
  type: string;
  description?: Child;
  required?: boolean;
  defaultValue?: string;
  deprecated?: boolean;
};

/** A semantic two-column table keeps long types readable on narrow screens. */
export function TypeTable({
  properties,
  caption = "Properties",
  emptyLabel = "No properties.",
}: {
  properties: readonly TypeProperty[];
  caption?: string;
  emptyLabel?: string;
}) {
  if (!properties.length)
    return (
      <div class={html`${typeTableStyles}hx-type-table-empty`}>
        <p>{caption}</p>
        <p>{emptyLabel}</p>
      </div>
    );
  return (
    <div class={html`${typeTableStyles}hx-type-table`}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Type and description</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr>
              <th scope="row">
                <code>{property.name}</code>
                <span class="hx-property-status">
                  {property.required ? "Required" : "Optional"}
                  {property.deprecated ? " · Deprecated" : ""}
                </span>
              </th>
              <td>
                <code class="hx-property-type">{property.type}</code>
                {property.description ? <div class="hx-property-description">{property.description}</div> : null}
                {property.defaultValue !== undefined ? (
                  <p class="hx-property-default">
                    Default: <code>{property.defaultValue}</code>
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
