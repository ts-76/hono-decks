/** @jsxImportSource hono/jsx/dom */
import { useState } from "hono/jsx/dom";
import type { SlideComponentProps } from "hono-decks";

export function MotionMeter(props: SlideComponentProps) {
  const label = typeof props.label === "string" ? props.label : "Animation";
  const initial = typeof props.initial === "number" ? props.initial : 40;
  const [value, setValue] = useState(initial);
  const nextValue = value >= 95 ? 20 : value + 15;

  return (
    <div class="motion-meter" data-motion-meter data-motion-active={value > initial ? "true" : "false"}>
      <span>{label}</span>
      <div class="motion-meter-track" aria-hidden="true">
        <span class="motion-meter-fill" style={`width:${value}%`} />
      </div>
      <button
        type="button"
        data-motion-meter-button
        aria-label={`${label}: ${value}%`}
        onClick={() => setValue(nextValue)}
      >
        {value}%
      </button>
    </div>
  );
}
