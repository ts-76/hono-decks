/** Parse a duration string, or a numeric value expressed in the given unit. */
export function parseDuration(value: unknown, numericUnit: "minutes" | "seconds"): number | undefined {
  if (typeof value === "number") {
    const seconds = value * (numericUnit === "minutes" ? 60 : 1);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }
  if (typeof value !== "string" || !/^(?:\d+h)?(?:\d+m)?(?:\d+s)?$/.test(value) || !value) return undefined;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return undefined;
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
}
