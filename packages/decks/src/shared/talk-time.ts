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
