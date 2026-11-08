/**
 * Compares elapsed time with the time budget of the current slide. Each slide gets
 * an equal share of the duration; being anywhere inside the current slide's window
 * is on pace. Returns the distance to that window in seconds (positive = ahead).
 * Embedded into the presenter and remote scripts with Function#toString, so keep it self-contained.
 */
export function talkPace(
  elapsedSeconds: number,
  durationSeconds: number,
  slideIndex: number,
  slideCount: number,
): { state: "on" | "ahead" | "behind"; seconds: number } {
  const perSlide = durationSeconds / Math.max(slideCount, 1);
  const windowStart = perSlide * slideIndex;
  const windowEnd = windowStart + perSlide;
  if (elapsedSeconds < windowStart) return { state: "ahead", seconds: windowStart - elapsedSeconds };
  if (elapsedSeconds > windowEnd) return { state: "behind", seconds: elapsedSeconds - windowEnd };
  return { state: "on", seconds: 0 };
}

/** Formats seconds as mm:ss, or h:mm:ss from one hour. Embedded into the presenter and remote scripts. */
export function formatTalkTime(totalSeconds: number): string {
  const seconds = Math.floor(Math.abs(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const head = hours ? `${hours}:${String(minutes).padStart(2, "0")}` : String(minutes).padStart(2, "0");
  return `${head}:${String(rest).padStart(2, "0")}`;
}

/**
 * Current time in epoch milliseconds from the Temporal API when the runtime has it
 * (browsers, and Workers with the `temporal` compatibility flag), else `Date.now()`.
 * Both read the same system clock; Temporal is preferred as the standard API.
 * Embedded into the presenter and remote scripts, so keep it self-contained.
 */
export function epochNow(): number {
  const temporal = (globalThis as { Temporal?: { Now: { instant(): { epochMilliseconds: number } } } }).Temporal;
  return temporal ? temporal.Now.instant().epochMilliseconds : Date.now();
}

/** Local wall-clock time for display, via `Temporal.Now.plainTimeISO()` when available. */
export function formatClock(locale?: string): string {
  const temporal = (
    globalThis as {
      Temporal?: { Now: { plainTimeISO(): { toLocaleString(locale?: string, options?: object): string } } };
    }
  ).Temporal;
  const options = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
  return temporal
    ? temporal.Now.plainTimeISO().toLocaleString(locale, options)
    : new Date().toLocaleTimeString(locale, options as Intl.DateTimeFormatOptions);
}
