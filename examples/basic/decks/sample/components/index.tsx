/** @jsxImportSource hono/jsx */

import type { SlideComponentProps } from "hono-decks";

const componentStyle = `
.sample-badge {
  display: inline-flex;
  margin-top: 1rem;
  padding: .35rem .6rem;
  border-radius: 8px;
  background: #dff7ff;
  color: #062633;
  font-weight: 700;
}

.sample-counter {
  display: inline-grid;
  grid-template-columns: auto auto;
  gap: .5rem;
  align-items: center;
  margin-top: 1rem;
  padding: .5rem;
  border: 1px solid rgba(223, 247, 255, .48);
  border-radius: 8px;
  background: rgba(223, 247, 255, .12);
}
`;

export function Badge(props: SlideComponentProps) {
  return (
    <>
      <style id="sample-deck-components">{componentStyle}</style>
      <p class="sample-badge">{String(props.label)}</p>
    </>
  );
}

export const Counter = {
  client: true,
  component(props: SlideComponentProps) {
    const label = typeof props.label === "string" ? props.label : "Count";
    const initial = typeof props.initial === "number" ? props.initial : 0;

    return (
      <div class="sample-counter" data-sample-counter>
        <style id="sample-deck-components">{componentStyle}</style>
        <span>{label}</span>
        <button type="button" data-sample-counter-button>
          {initial}
        </button>
      </div>
    );
  },
};
