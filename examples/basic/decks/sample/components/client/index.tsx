/** @jsxImportSource hono/jsx/dom */
import { useState } from "hono/jsx/dom";
import type { SlideComponentProps } from "@hono/decks";

export function Counter(props: SlideComponentProps) {
  const label = typeof props.label === "string" ? props.label : "Count";
  const initial = typeof props.initial === "number" ? props.initial : 0;
  const [count, setCount] = useState(initial);

  return (
    <div class="sample-counter" data-sample-counter>
      <span>{label}</span>
      <button
        type="button"
        data-sample-counter-button
        aria-label={`${label}: ${count}`}
        onClick={() => setCount((current) => current + 1)}
      >
        {count}
      </button>
    </div>
  );
}
