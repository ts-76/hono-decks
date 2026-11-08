import { localizedHref, type Locale } from "../i18n";

const siteOrigin = "https://hono-decks.com";

export function SocialMetadata({
  title,
  description,
  path,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
}) {
  const url = new URL(localizedHref(path, locale), siteOrigin).href;
  const image = `${siteOrigin}/ogp.png`;
  return (
    <>
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="hono-decks" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={locale === "ja" ? "ja_JP" : "en_US"} />
      <meta property="og:locale:alternate" content={locale === "ja" ? "en_US" : "ja_JP"} />
      <meta property="og:image" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="hono-decks — MDX slides. Hono routes." />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="hono-decks — MDX slides. Hono routes." />
    </>
  );
}
