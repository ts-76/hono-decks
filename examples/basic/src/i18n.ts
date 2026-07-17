import type { Context } from "hono";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export function getLocale(c: Context): Locale {
  return c.get("language") === "ja" ? "ja" : "en";
}

export function localizedHref(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path;
  const url = new URL(path, "https://basic.hono-decks.com");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
