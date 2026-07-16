/** @jsxImportSource hono/jsx */

import type { SlideComponentProps } from "hono-decks";

export const MotionMeter = {
  client: true,
  component(props: SlideComponentProps) {
    const label = typeof props.label === "string" ? props.label : "Animation";
    const initial = typeof props.initial === "number" ? props.initial : 40;

    return (
      <div class="motion-meter" data-motion-meter>
        <span>{label}</span>
        <div class="motion-meter-track" aria-hidden="true">
          <span class="motion-meter-fill" style={`width:${initial}%`} />
        </div>
        <button type="button" data-motion-meter-button>
          {initial}%
        </button>
      </div>
    );
  },
};
