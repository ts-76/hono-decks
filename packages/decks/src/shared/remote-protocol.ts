/** The position shared by a presentation room. Slide and step indices are zero-based. */
export interface RemotePosition {
  index: number;
  stepIndex: number;
}

/** The presenter's talk timer. `elapsed` is in milliseconds as of sending. */
export interface RemoteTimer {
  elapsed: number;
  running: boolean;
  /** Target talk length in seconds set on the presenter page; `null` clears it. */
  duration?: number | null;
}

export type RemoteMessage =
  | ({ type: "state" } & RemotePosition)
  | ({ type: "timer" } & RemoteTimer)
  | { type: "command"; command: "previous" | "next" }
  | ({ type: "command"; command: "goTo" } & RemotePosition);

/** Parse untrusted socket input. The slide count is supplied by the server, never the client. */
export function parseRemoteMessage(input: unknown, slideCount: number): RemoteMessage | null {
  if (typeof input !== "string" || new TextEncoder().encode(input).byteLength > 1024) return null;
  if (!Number.isSafeInteger(slideCount) || slideCount < 1) return null;
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (message.type === "timer") {
    const { elapsed, running } = message;
    if (typeof running !== "boolean" || typeof elapsed !== "number" || !Number.isFinite(elapsed)) return null;
    if (elapsed < 0 || elapsed > 7 * 24 * 60 * 60 * 1000) return null;
    const { duration } = message;
    if (duration === undefined) return { type: "timer", elapsed: Math.floor(elapsed), running };
    if (
      duration !== null &&
      (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 || duration > 86400)
    )
      return null;
    return {
      type: "timer",
      elapsed: Math.floor(elapsed),
      running,
      duration: duration === null ? null : Math.round(duration),
    };
  }
  if (message.type === "command" && (message.command === "next" || message.command === "previous")) {
    return { type: "command", command: message.command };
  }
  if (message.type !== "state" && !(message.type === "command" && message.command === "goTo")) return null;
  const { index, stepIndex } = message;
  if (
    typeof index !== "number" ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= slideCount ||
    typeof stepIndex !== "number" ||
    !Number.isSafeInteger(stepIndex) ||
    stepIndex < 0
  )
    return null;
  return message.type === "state"
    ? { type: "state", index, stepIndex }
    : { type: "command", command: "goTo", index, stepIndex };
}
