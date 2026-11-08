/**
 * Compares elapsed time with the time budget of the current slide. `plan` lists the
 * main slides' budgets in seconds (`null` = share the rest equally), or is a slide
 * count for an equal split. Being anywhere inside the current slide's window is on
 * pace. Returns the distance to that window in seconds, or `null` for appendix slides.
 * Embedded into the presenter and remote scripts with Function#toString, so keep it self-contained.
 */
export function talkPace(
  elapsedSeconds: number,
  durationSeconds: number,
  slideIndex: number,
  plan: number | Array<number | null>,
): { state: "on" | "ahead" | "behind"; seconds: number } | null {
  const times: Array<number | null> =
    typeof plan === "number" ? Array.from({ length: Math.max(plan, 1) }, () => null) : plan;
  if (slideIndex < 0 || slideIndex >= times.length) return null;
  let fixed = 0;
  let shared = 0;
  for (const time of times) {
    if (time && time > 0) fixed += time;
    else shared += 1;
  }
  const share = shared ? Math.max(0, durationSeconds - fixed) / shared : 0;
  // No inner named functions: bundlers that keep names would wrap them in a helper
  // that does not exist once this function is embedded with toString().
  let windowStart = 0;
  let windowEnd = 0;
  for (let index = 0; index <= slideIndex; index += 1) {
    const time = times[index] ?? null;
    windowStart = windowEnd;
    windowEnd += time && time > 0 ? time : share;
  }
  if (elapsedSeconds < windowStart) return { state: "ahead", seconds: windowStart - elapsedSeconds };
  if (elapsedSeconds > windowEnd) return { state: "behind", seconds: elapsedSeconds - windowEnd };
  return { state: "on", seconds: 0 };
}

/** Budgets of the main slides for `talkPace`: slides before the first `appendix: true`. */
export function talkPlan(slides: ReadonlyArray<{ meta: { time?: number; appendix?: boolean } }>): Array<number | null> {
  const appendixStart = slides.findIndex((slide) => slide.meta.appendix);
  const main = appendixStart === -1 ? slides : slides.slice(0, appendixStart);
  return main.map((slide) => slide.meta.time ?? null);
}

/** Resolves which timer readouts are shown; every readout defaults to shown. */
export function resolveTimerDisplay(
  ...layers: Array<{ pace?: boolean; remaining?: boolean; overtime?: boolean } | undefined>
): { pace: boolean; remaining: boolean; overtime: boolean } {
  const display = { pace: true, remaining: true, overtime: true };
  for (const layer of layers)
    Object.assign(
      display,
      Object.fromEntries(Object.entries(layer ?? {}).filter(([, value]) => typeof value === "boolean")),
    );
  return display;
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
