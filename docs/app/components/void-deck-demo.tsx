/** @jsxImportSource hono/jsx */
import DemoFrame from "./demo-frame";

// Public sample origin, shared by both documentation languages.
export const voidSampleOrigin = "https://void.hono-decks.com";

export function VoidDeckDemo({ locale = "en" }: { locale?: "en" | "ja" }) {
  return (
    <DemoFrame
      src={`${voidSampleOrigin}/slides/welcome/embed`}
      href={voidSampleOrigin}
      title={locale === "ja" ? "Void に埋め込んだスライド" : "Slides embedded in Void"}
      linkLabel={locale === "ja" ? "サンプル全体を開く" : "Open the full sample"}
      aspectRatio={16 / 9}
      allowFullscreen
      openInNewTab
    />
  );
}
