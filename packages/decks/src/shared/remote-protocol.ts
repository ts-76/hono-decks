/** The position shared by a presentation room. Slide and step indices are zero-based. */
export interface RemotePosition {
  index: number;
  stepIndex: number;
}

export type RemoteMessage =
  | ({ type: "state" } & RemotePosition)
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
