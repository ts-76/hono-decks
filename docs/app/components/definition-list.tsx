/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export type DefinitionItem = { term: Child; description: Child };

export function DefinitionList({ items, label }: { items: readonly DefinitionItem[]; label?: string }) {
  if (!items.length) return null;
  return (
    <dl class="hx-definition-list" aria-label={label}>
      {items.map(({ term, description }) => (
        <div class="hx-definition-row">
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}
