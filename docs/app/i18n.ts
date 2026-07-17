import type { Context } from "hono";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export function getLocale(c: Context): Locale {
  return c.get("language") === "ja" ? "ja" : "en";
}

export function localizedHref(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path;
  const url = new URL(path, "https://docs.example");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

const en = {
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
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  route: "Route / API",
  role: "Purpose",
  language: "Language",
  footerLine: "Build slides from MDX and serve them from your Hono app.",
  navGettingStarted: "Get started",
  navGettingStartedDetail: "install and render your first deck",
  navExamples: "Examples",
  navExamplesDetail: "live decks / HonoX portfolio",
  navAuthoring: "Author slides",
  navAuthoringDetail: "MDX / components / assets / theme",
  navConfiguration: "Configure",
  navConfigurationDetail: "config file / development / overrides",
  navRecipes: "Recipes",
  navRecipesDetail: "OGP images / PDF and PNG export",
  navRouting: "Choose surfaces",
  navRoutingDetail: "viewer / presenter / print",
  navSecurity: "Publish safely",
  navSecurityDetail: "language / CSP / embeds",
  navApi: "API",
  navApiDetail: "entries / use cases / types",
  deployTitle: "Deploy to Cloudflare",
  deployNote: "Clone the minimal example into your Cloudflare account and deploy it as a Worker.",
  deployUnavailable: "The public sample repository is coming soon.",
  deployComingSoon: "Sample coming soon",
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;
type MessageCatalog = Record<MessageKey, string>;

const ja = {
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
  copy: "コピー",
  copied: "コピーしました",
  copyFailed: "コピーできませんでした",
  route: "ルート / API",
  role: "役割",
  language: "言語",
  footerLine: "MDXからスライドを生成し、Honoアプリから配信します。",
  navGettingStarted: "導入",
  navGettingStartedDetail: "インストールから最初の表示まで",
  navExamples: "実例",
  navExamplesDetail: "公開デッキ / HonoXポートフォリオ",
  navAuthoring: "スライドを書く",
  navAuthoringDetail: "MDX / コンポーネント / 画像 / テーマ",
  navConfiguration: "設定",
  navConfigurationDetail: "設定ファイル / 開発 / 上書き",
  navRecipes: "レシピ",
  navRecipesDetail: "OGP画像 / PDF・PNG出力",
  navRouting: "ルートと画面",
  navRoutingDetail: "閲覧 / 発表 / 印刷",
  navSecurity: "HTMLとセキュリティ",
  navSecurityDetail: "言語 / CSP / 埋め込み",
  navApi: "API",
  navApiDetail: "エントリー / 用途 / 型",
  deployTitle: "Deploy to Cloudflare",
  deployNote: "最小構成のサンプルをCloudflareアカウントに複製し、Workerとしてデプロイします。",
  deployUnavailable: "公開サンプルリポジトリを準備中です。",
  deployComingSoon: "サンプル準備中",
} satisfies MessageCatalog;

export const messages = { en, ja } satisfies Record<Locale, MessageCatalog>;

export function t(locale: Locale) {
  return messages[locale];
}
