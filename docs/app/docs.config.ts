import { defineDocsConfig } from "honoxpress";

/** Site identity and supported languages live here; routes keep their existing URLs. */
const docsSite = defineDocsConfig({
  name: "hono-decks",
  defaultLocale: "en",
  homeHref: "/",
  docsHref: "/docs/getting-started",
  repositoryHref: "https://github.com/ts-76/hono-decks",
  stylesheetHref: "/app/style.css",
  themeSwitch: true,
  localeLabels: { en: "English", ja: "日本語" },
  labels: {
    en: { nav: "Documentation", toc: "On this page", skip: "Skip to content" },
    ja: { nav: "ドキュメント", toc: "このページの内容", skip: "本文へ移動" },
  },
  footer: "Built with HonoX and honoxpress.",
});

export default docsSite;
