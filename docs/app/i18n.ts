import type { Context } from "hono";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export function getLocale(c: Context): Locale {
  return c.get("language") === "en" ? "en" : "ja";
}

export function localizedHref(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path;
  const url = new URL(path, "https://docs.example");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

export const messages = {
  ja: {
    guides: "ガイド",
    api: "API",
    menu: "メニュー",
    close: "閉じる",
    primaryNavigation: "メインナビゲーション",
    mobileNavigation: "モバイルナビゲーション",
    footerNavigation: "フッターナビゲーション",
    skip: "本文へ移動",
    documentation: "ドキュメント",
    documentationSections: "ドキュメント一覧",
    onThisPage: "このページの内容",
    selectGuide: "ガイドを選ぶ",
    copy: "コピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした",
    route: "Route / API",
    role: "役割",
    language: "言語",
    footerLine: "build-time MDX、runtime Hono routes。",
  },
  en: {
    guides: "Guides",
    api: "API",
    menu: "Menu",
    close: "Close",
    primaryNavigation: "Primary navigation",
    mobileNavigation: "Mobile navigation",
    footerNavigation: "Footer navigation",
    skip: "Skip to content",
    documentation: "Documentation",
    documentationSections: "Documentation sections",
    onThisPage: "On this page",
    selectGuide: "Choose a guide",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    route: "Route / API",
    role: "Purpose",
    language: "Language",
    footerLine: "build-time MDX, runtime Hono routes.",
  },
} as const;

export function t(locale: Locale) {
  return messages[locale];
}
