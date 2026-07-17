// @ts-nocheck
import { configureDecks, defineDecks } from "hono-decks/advanced";
import type { ConfiguredDecks, DecksConfig } from "hono-decks";
import type { Env } from "hono";
import { decksClientEntry } from "./client-entry";
import Slide_code_0 from "./decks/code/slide-0";
import Slide_code_1 from "./decks/code/slide-1";
import Slide_media_0 from "./decks/media/slide-0";
import Slide_media_1 from "./decks/media/slide-1";
import Slide_media_2 from "./decks/media/slide-2";
import Slide_media_3 from "./decks/media/slide-3";
import Slide_media_4 from "./decks/media/slide-4";
import Slide_media_5 from "./decks/media/slide-5";
import Slide_motion_0 from "./decks/motion/slide-0";
import Slide_motion_1 from "./decks/motion/slide-1";
import Slide_motion_2 from "./decks/motion/slide-2";
import Slide_sample_0 from "./decks/sample/slide-0";
import Slide_sample_1 from "./decks/sample/slide-1";
import Slide_sample_2 from "./decks/sample/slide-2";
import * as Components_motion from "../../decks/motion/components";
import * as Components_sample from "../../decks/sample/components";

function withClientComponentIds(module, clientIds) {
  const registry = {};
  for (const [name, value] of Object.entries(module)) {
    const clientId = clientIds[name];
    if (typeof value === "function") {
      registry[name] = clientId ? { component: value, clientId } : value;
      continue;
    }
    if (value && typeof value === "object" && "component" in value) {
      registry[name] = clientId ? { ...value, clientId } : value;
    }
  }
  return registry;
}

const generatedDecks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
    {
      slug: "code",
      sourcePath: "decks/code/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "Code Verification",
        "description": "Shikiで強調表示したコードを、固定16:9キャンバスで読みやすく見せる",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "fade",
        "transitionDuration": "280ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "code",
          "shiki",
          "mdx"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #fff9f5;\n  --hono-decks-muted-color: #d9c9bf;\n  --hono-decks-accent-color: #ff6b2c;\n  --hono-decks-border-color: rgba(255, 249, 245, 0.18);\n  --hono-decks-card-background: #202126;\n  --hono-decks-inline-code-background: rgba(255, 107, 44, 0.14);\n  --hono-decks-code-background: #090a0c;\n  font-family: \"Avenir Next\", \"Segoe UI\", ui-sans-serif, sans-serif;\n}\n\n.layout-code {\n  position: relative;\n  background: #111216;\n  color: #fff9f5;\n}\n\n.layout-code::before {\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 18px;\n  background: #ff6b2c;\n  content: \"\";\n}\n\n.layout-code .hono-decks-slide-content {\n  display: grid;\n  box-sizing: border-box;\n  grid-template-columns: minmax(14rem, 0.78fr) minmax(0, 1.22fr);\n  gap: 2rem;\n  align-items: center;\n  padding: 2.1rem 2.4rem 2.1rem 2.8rem;\n}\n\n.code-heading p {\n  margin: 0 0 0.65rem;\n  color: #ff9a6e;\n  font-size: 0.68rem;\n  font-weight: 720;\n}\n\n.code-heading h1,\n.code-heading h2 {\n  max-width: 9ch;\n  margin: 0;\n  font-size: 3.4rem;\n  letter-spacing: -0.04em;\n  line-height: 0.95;\n  text-wrap: balance;\n}\n\n.code-heading.compact h2 {\n  font-size: 3rem;\n}\n\n.layout-code pre,\n.layout-code .hono-decks-code-block {\n  grid-column: 2;\n  grid-row: 1;\n  margin: 0;\n}\n\n.layout-code pre {\n  max-height: 16.5rem;\n  border: 0;\n  border-radius: 8px;\n  padding: 1rem;\n  font-size: 0.72rem;\n  line-height: 1.55;\n}\n\n.layout-code .hono-decks-code-caption {\n  border: 0;\n  background: #ff6b2c;\n  color: #111216;\n  font-size: 0.58rem;\n  font-weight: 760;\n}\n\n.code-caption,\n.code-proof {\n  position: absolute;\n  bottom: 1.5rem;\n  left: 2.8rem;\n  margin: 0;\n  color: var(--hono-decks-muted-color);\n  font-size: 0.58rem;\n}\n\n.code-proof {\n  display: flex;\n  gap: 0.35rem;\n}\n\n.code-proof span {\n  border: 1px solid var(--hono-decks-border-color);\n  border-radius: 999px;\n  padding: 0.22rem 0.42rem;\n}\n",
      "themeSourcePath": "decks/code/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Fenced code",
            "layout": "code",
            "notes": "HTMLに見えるJSXも安全にescapeされ、長いコードはキャンバスを壊さずスクロールする。",
            "transition": "fade",
            "transitionDuration": "280ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "HTMLに見えるJSXも安全にescapeされ、長いコードはキャンバスを壊さずスクロールする。",
          render: Slide_code_0
        },
        {
          index: 1,
          meta: {
            "title": "CodeBlock component",
            "layout": "code",
            "notes": "filenameと行ハイライトをMDXの近くで宣言できることを示す。",
            "transition": "fade",
            "transitionDuration": "280ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "filenameと行ハイライトをMDXの近くで宣言できることを示す。",
          render: Slide_code_1
        }
      ]
    },
    {
      slug: "media",
      sourcePath: "decks/media/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "Media Verification",
        "description": "Local assets, R2, video, social posts, and link cards in one deck",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "fade",
        "transitionDuration": "300ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "media",
          "r2",
          "embeds"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #f4fbff;\n  --hono-decks-muted-color: #b9d4e5;\n  --hono-decks-accent-color: #48d7ff;\n  --hono-decks-border-color: rgba(137, 218, 255, 0.24);\n  --hono-decks-card-background: #0d2337;\n  --hono-decks-inline-code-background: rgba(72, 215, 255, 0.12);\n  --hono-decks-code-background: #06101d;\n  font-family: \"Avenir Next\", \"Segoe UI\", ui-sans-serif, sans-serif;\n}\n\n.layout-media {\n  position: relative;\n  background: #07111f;\n  color: #f4fbff;\n}\n\n.layout-media::after {\n  position: absolute;\n  right: -4rem;\n  bottom: -6rem;\n  width: 17rem;\n  height: 17rem;\n  border: 1px solid rgba(72, 215, 255, 0.28);\n  border-radius: 999px;\n  content: \"\";\n}\n\n.layout-media .hono-decks-slide-content {\n  position: relative;\n  z-index: 1;\n  box-sizing: border-box;\n  padding: 1.8rem 2.3rem;\n}\n\n.media-heading {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 1rem;\n  border-bottom: 1px solid var(--hono-decks-border-color);\n  padding-bottom: 0.6rem;\n}\n\n.media-heading.inline {\n  margin-bottom: 0.7rem;\n}\n\n.media-heading p {\n  margin: 0;\n  color: #70ddff;\n  font-size: 0.62rem;\n  font-weight: 720;\n}\n\n.media-heading h1 {\n  margin: 0;\n  font-size: 2.1rem;\n  letter-spacing: -0.035em;\n  line-height: 1;\n}\n\n.media-showcase {\n  display: grid;\n  grid-template-columns: minmax(0, 1.25fr) minmax(10rem, 0.75fr);\n  gap: 2rem;\n  align-items: center;\n  height: calc(100% - 3.2rem);\n}\n\n.media-showcase.reverse .media-image {\n  order: 2;\n}\n\n.layout-media .media-image {\n  display: block;\n  width: 100%;\n  max-height: 20rem;\n  object-fit: contain;\n}\n\n.media-showcase p {\n  color: var(--hono-decks-muted-color);\n  font-size: 1.05rem;\n  line-height: 1.5;\n}\n\n.media-showcase strong {\n  color: #f4fbff;\n}\n\n.layout-media .hono-decks-embed-frame,\n.layout-media .hono-decks-social-embed,\n.layout-media .hono-decks-tweet-embed,\n.layout-media .hono-decks-link-card {\n  width: min(100%, 31rem);\n  margin: 0.55rem auto 0;\n}\n\n.layout-media .hono-decks-embed-viewport {\n  max-height: 18rem;\n}\n\n.layout-media .hono-decks-link-card-anchor,\n.layout-media .hono-decks-social-card,\n.layout-media .twitter-tweet {\n  border-radius: 10px;\n  background: #0d2337;\n}\n\n.layout-media > .hono-decks-slide-content > p {\n  margin: 0.45rem auto;\n  max-width: 31rem;\n  color: var(--hono-decks-muted-color);\n  font-size: 0.62rem;\n}\n",
      "themeSourcePath": "decks/media/theme.css",

      assets: [
        {
          "sourcePath": "decks/media/assets/local-jsx.svg",
          "publicPath": "/decks/media/assets/local-jsx.svg",
          "type": "local",
          "contentType": "image/svg+xml",
          "body": new Uint8Array([60, 115, 118, 103, 32, 120, 109, 108, 110, 115, 61, 34, 104, 116, 116, 112, 58, 47, 47, 119, 119, 119, 46, 119, 51, 46, 111, 114, 103, 47, 50, 48, 48, 48, 47, 115, 118, 103, 34, 32, 118, 105, 101, 119, 66, 111, 120, 61, 34, 48, 32, 48, 32, 54, 52, 48, 32, 51, 54, 48, 34, 32, 114, 111, 108, 101, 61, 34, 105, 109, 103, 34, 32, 97, 114, 105, 97, 45, 108, 97, 98, 101, 108, 108, 101, 100, 98, 121, 61, 34, 116, 105, 116, 108, 101, 32, 100, 101, 115, 99, 34, 62, 10, 32, 32, 60, 116, 105, 116, 108, 101, 32, 105, 100, 61, 34, 116, 105, 116, 108, 101, 34, 62, 76, 111, 99, 97, 108, 32, 74, 83, 88, 32, 97, 115, 115, 101, 116, 60, 47, 116, 105, 116, 108, 101, 62, 10, 32, 32, 60, 100, 101, 115, 99, 32, 105, 100, 61, 34, 100, 101, 115, 99, 34, 62, 65, 32, 108, 111, 99, 97, 108, 32, 105, 109, 97, 103, 101, 32, 117, 115, 101, 100, 32, 102, 114, 111, 109, 32, 97, 32, 74, 83, 88, 32, 105, 109, 103, 32, 101, 108, 101, 109, 101, 110, 116, 32, 105, 110, 32, 97, 32, 100, 101, 99, 107, 46, 60, 47, 100, 101, 115, 99, 62, 10, 32, 32, 60, 114, 101, 99, 116, 32, 119, 105, 100, 116, 104, 61, 34, 54, 52, 48, 34, 32, 104, 101, 105, 103, 104, 116, 61, 34, 51, 54, 48, 34, 32, 114, 120, 61, 34, 50, 56, 34, 32, 102, 105, 108, 108, 61, 34, 35, 49, 52, 98, 56, 97, 54, 34, 32, 47, 62, 10, 32, 32, 60, 99, 105, 114, 99, 108, 101, 32, 99, 120, 61, 34, 49, 54, 48, 34, 32, 99, 121, 61, 34, 49, 52, 48, 34, 32, 114, 61, 34, 54, 52, 34, 32, 102, 105, 108, 108, 61, 34, 35, 102, 101, 102, 51, 99, 55, 34, 32, 47, 62, 10, 32, 32, 60, 112, 97, 116, 104, 32, 100, 61, 34, 77, 56, 48, 32, 50, 57, 50, 104, 52, 56, 48, 76, 51, 57, 52, 32, 49, 53, 50, 32, 50, 55, 56, 32, 50, 52, 54, 108, 45, 54, 48, 45, 53, 50, 122, 34, 32, 102, 105, 108, 108, 61, 34, 35, 48, 52, 50, 102, 50, 101, 34, 32, 111, 112, 97, 99, 105, 116, 121, 61, 34, 46, 55, 50, 34, 32, 47, 62, 10, 32, 32, 60, 116, 101, 120, 116, 32, 120, 61, 34, 51, 50, 48, 34, 32, 121, 61, 34, 56, 54, 34, 32, 116, 101, 120, 116, 45, 97, 110, 99, 104, 111, 114, 61, 34, 109, 105, 100, 100, 108, 101, 34, 32, 102, 111, 110, 116, 45, 102, 97, 109, 105, 108, 121, 61, 34, 65, 114, 105, 97, 108, 44, 32, 115, 97, 110, 115, 45, 115, 101, 114, 105, 102, 34, 32, 102, 111, 110, 116, 45, 115, 105, 122, 101, 61, 34, 52, 50, 34, 32, 102, 111, 110, 116, 45, 119, 101, 105, 103, 104, 116, 61, 34, 55, 48, 48, 34, 32, 102, 105, 108, 108, 61, 34, 35, 48, 52, 50, 102, 50, 101, 34, 62, 76, 111, 99, 97, 108, 32, 74, 83, 88, 60, 47, 116, 101, 120, 116, 62, 10, 60, 47, 115, 118, 103, 62, 10])
        },
        {
          "sourcePath": "decks/media/assets/r2-remote.svg",
          "publicPath": "/decks/media/assets/r2-remote.svg",
          "type": "local",
          "contentType": "image/svg+xml",
          "body": new Uint8Array([60, 115, 118, 103, 32, 120, 109, 108, 110, 115, 61, 34, 104, 116, 116, 112, 58, 47, 47, 119, 119, 119, 46, 119, 51, 46, 111, 114, 103, 47, 50, 48, 48, 48, 47, 115, 118, 103, 34, 32, 118, 105, 101, 119, 66, 111, 120, 61, 34, 48, 32, 48, 32, 51, 50, 48, 32, 49, 56, 48, 34, 32, 114, 111, 108, 101, 61, 34, 105, 109, 103, 34, 32, 97, 114, 105, 97, 45, 108, 97, 98, 101, 108, 108, 101, 100, 98, 121, 61, 34, 116, 105, 116, 108, 101, 32, 100, 101, 115, 99, 34, 62, 10, 32, 32, 60, 116, 105, 116, 108, 101, 32, 105, 100, 61, 34, 116, 105, 116, 108, 101, 34, 62, 82, 50, 45, 98, 97, 99, 107, 101, 100, 32, 109, 101, 100, 105, 97, 32, 97, 115, 115, 101, 116, 60, 47, 116, 105, 116, 108, 101, 62, 10, 32, 32, 60, 100, 101, 115, 99, 32, 105, 100, 61, 34, 100, 101, 115, 99, 34, 62, 65, 32, 109, 101, 100, 105, 97, 32, 100, 101, 99, 107, 32, 105, 109, 97, 103, 101, 32, 116, 104, 97, 116, 32, 99, 97, 110, 32, 98, 101, 32, 115, 101, 114, 118, 101, 100, 32, 102, 114, 111, 109, 32, 97, 110, 32, 82, 50, 32, 98, 105, 110, 100, 105, 110, 103, 46, 60, 47, 100, 101, 115, 99, 62, 10, 32, 32, 60, 114, 101, 99, 116, 32, 119, 105, 100, 116, 104, 61, 34, 51, 50, 48, 34, 32, 104, 101, 105, 103, 104, 116, 61, 34, 49, 56, 48, 34, 32, 114, 120, 61, 34, 49, 56, 34, 32, 102, 105, 108, 108, 61, 34, 35, 49, 101, 49, 98, 52, 98, 34, 32, 47, 62, 10, 32, 32, 60, 112, 97, 116, 104, 32, 100, 61, 34, 77, 51, 54, 32, 49, 51, 50, 76, 49, 48, 51, 32, 54, 54, 108, 52, 56, 32, 52, 53, 32, 51, 50, 45, 50, 57, 32, 49, 48, 49, 32, 57, 50, 72, 51, 54, 122, 34, 32, 102, 105, 108, 108, 61, 34, 35, 56, 98, 53, 99, 102, 54, 34, 32, 111, 112, 97, 99, 105, 116, 121, 61, 34, 46, 57, 50, 34, 32, 47, 62, 10, 32, 32, 60, 99, 105, 114, 99, 108, 101, 32, 99, 120, 61, 34, 50, 51, 54, 34, 32, 99, 121, 61, 34, 53, 52, 34, 32, 114, 61, 34, 50, 52, 34, 32, 102, 105, 108, 108, 61, 34, 35, 102, 56, 102, 97, 102, 99, 34, 32, 111, 112, 97, 99, 105, 116, 121, 61, 34, 46, 57, 53, 34, 32, 47, 62, 10, 32, 32, 60, 114, 101, 99, 116, 32, 120, 61, 34, 51, 50, 34, 32, 121, 61, 34, 50, 52, 34, 32, 119, 105, 100, 116, 104, 61, 34, 49, 49, 54, 34, 32, 104, 101, 105, 103, 104, 116, 61, 34, 50, 56, 34, 32, 114, 120, 61, 34, 49, 52, 34, 32, 102, 105, 108, 108, 61, 34, 35, 51, 49, 50, 101, 56, 49, 34, 32, 47, 62, 10, 32, 32, 60, 116, 101, 120, 116, 32, 120, 61, 34, 57, 48, 34, 32, 121, 61, 34, 52, 51, 34, 32, 116, 101, 120, 116, 45, 97, 110, 99, 104, 111, 114, 61, 34, 109, 105, 100, 100, 108, 101, 34, 32, 102, 111, 110, 116, 45, 102, 97, 109, 105, 108, 121, 61, 34, 65, 114, 105, 97, 108, 44, 32, 115, 97, 110, 115, 45, 115, 101, 114, 105, 102, 34, 32, 102, 111, 110, 116, 45, 115, 105, 122, 101, 61, 34, 49, 52, 34, 32, 102, 111, 110, 116, 45, 119, 101, 105, 103, 104, 116, 61, 34, 55, 48, 48, 34, 32, 102, 105, 108, 108, 61, 34, 35, 99, 52, 98, 53, 102, 100, 34, 62, 82, 50, 32, 65, 83, 83, 69, 84, 60, 47, 116, 101, 120, 116, 62, 10, 60, 47, 115, 118, 103, 62, 10])
        }
      ],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Local JSX image",
            "layout": "media",
            "notes": "相対パスのまま書いた画像が、compile時に公開アセットURLへ書き換えられる。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "相対パスのまま書いた画像が、compile時に公開アセットURLへ書き換えられる。",
          render: Slide_media_0
        },
        {
          index: 1,
          meta: {
            "title": "R2-backed image",
            "layout": "media",
            "notes": "同じ相対パスを保ったまま、配信元だけR2へ切り替えられる。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "同じ相対パスを保ったまま、配信元だけR2へ切り替えられる。",
          render: Slide_media_1
        },
        {
          index: 2,
          meta: {
            "title": "YouTube embed",
            "layout": "media",
            "notes": "Zenn形式の短い記法からsandbox付きのEmbedFrameを生成する。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "Zenn形式の短い記法からsandbox付きのEmbedFrameを生成する。",
          render: Slide_media_2
        },
        {
          index: 3,
          meta: {
            "title": "Generic iframe",
            "layout": "media",
            "notes": "任意のiframeも同じfallbackとprint挙動を共有する。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "任意のiframeも同じfallbackとprint挙動を共有する。",
          render: Slide_media_3
        },
        {
          index: 4,
          meta: {
            "title": "X post embed",
            "layout": "media",
            "notes": "公式ウィジェットを使いつつ、印刷時にはリンクへ退避する。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "公式ウィジェットを使いつつ、印刷時にはリンクへ退避する。",
          render: Slide_media_4
        },
        {
          index: 5,
          meta: {
            "title": "Link card",
            "layout": "media",
            "notes": "OGPメタデータをcompile時に解決し、runtimeはscriptなしのカードを配信する。",
            "transition": "fade",
            "transitionDuration": "300ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "OGPメタデータをcompile時に解決し、runtimeはscriptなしのカードを配信する。",
          render: Slide_media_5
        }
      ]
    },
    {
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "Motion Verification",
        "description": "Slide transitions, Fire reveals, and hydrated islands with reduced-motion support",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "slide-left",
        "transitionDuration": "420ms",
        "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
        "tags": [
          "motion",
          "islands",
          "accessibility"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #fff8f3;\n  --hono-decks-muted-color: #cabfb9;\n  --hono-decks-accent-color: #ff6b2c;\n  --hono-decks-border-color: rgba(255, 248, 243, 0.19);\n  --hono-decks-card-background: #1c1e24;\n  --hono-decks-inline-code-background: rgba(255, 107, 44, 0.14);\n  --hono-decks-code-background: #090a0c;\n  font-family: \"Avenir Next\", \"Segoe UI\", ui-sans-serif, sans-serif;\n}\n\n.layout-motion {\n  position: relative;\n  background: #111216;\n  color: #fff8f3;\n}\n\n.layout-motion::before {\n  position: absolute;\n  inset: auto 0 0;\n  height: 12px;\n  background: #ff6b2c;\n  content: \"\";\n}\n\n.layout-motion .hono-decks-slide-content {\n  position: relative;\n  z-index: 1;\n  box-sizing: border-box;\n  padding: 2rem 2.5rem;\n}\n\n.layout-motion h1,\n.layout-motion h2 {\n  max-width: 12ch;\n  margin: 0;\n  font-size: 3.25rem;\n  letter-spacing: -0.04em;\n  line-height: 0.96;\n  text-wrap: balance;\n}\n\n.layout-motion p,\n.layout-motion li {\n  color: var(--hono-decks-muted-color);\n  font-size: 0.83rem;\n  line-height: 1.52;\n}\n\n.motion-context {\n  margin: 0 0 0.7rem;\n  color: #ff9a6e !important;\n  font-size: 0.62rem !important;\n  font-weight: 740;\n}\n\n.motion-columns {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.7fr);\n  gap: 2.5rem;\n  align-items: center;\n  margin-top: 1.4rem;\n}\n\n.motion-columns ul {\n  display: grid;\n  gap: 0.35rem;\n  padding-left: 1.2em;\n}\n\n.motion-meter {\n  display: grid;\n  gap: 0.65rem;\n  border-top: 3px solid #ff6b2c;\n  background: #1c1e24;\n  padding: 1rem;\n}\n\n.motion-meter > span {\n  font-size: 0.72rem;\n  font-weight: 720;\n}\n\n.motion-meter-track {\n  height: 0.36rem;\n  overflow: hidden;\n  border-radius: 999px;\n  background: #383b44;\n}\n\n.motion-meter-fill {\n  display: block;\n  height: 100%;\n  border-radius: inherit;\n  background: #ff6b2c;\n}\n\n.motion-meter button {\n  justify-self: start;\n  min-height: 1.5rem;\n  border: 0;\n  border-radius: 999px;\n  background: #fff8f3;\n  padding: 0.2rem 0.55rem;\n  color: #111216;\n  font: inherit;\n  font-size: 0.62rem;\n  font-weight: 760;\n}\n\n.motion-sequence {\n  display: grid;\n  grid-template-columns: 1fr auto 1fr auto 1fr;\n  gap: 0.65rem;\n  align-items: center;\n  max-width: 34rem;\n  margin: 1.8rem 0 1.2rem;\n}\n\n.motion-sequence span,\n.motion-sequence strong {\n  display: grid;\n  min-height: 4rem;\n  place-items: center;\n  background: #1c1e24;\n  font-size: 0.8rem;\n}\n\n.motion-sequence > span[aria-hidden] {\n  min-height: 0;\n  background: transparent;\n  color: #ff9a6e;\n  font-size: 1.3rem;\n}\n\n.motion-sequence strong {\n  background: #ff6b2c;\n  color: #111216;\n}\n",
      "themeSourcePath": "decks/motion/theme.css",

      assets: [],
      componentRegistry: withClientComponentIds(Components_motion, {
        "MotionMeter": "MotionMeter__motion_11bl0b8"
      }),
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "CSS animation",
            "layout": "motion",
            "notes": "最初のスライドではCSSだけで動き、prefers-reduced-motionでは静止する軌道を見せる。",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "最初のスライドではCSSだけで動き、prefers-reduced-motionでは静止する軌道を見せる。",
          render: Slide_motion_0
        },
        {
          index: 1,
          meta: {
            "title": "Client island animation",
            "layout": "motion",
            "notes": "server-rendered markupの後から、必要な箇所だけhono/jsx/domでhydrateする。",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "server-rendered markupの後から、必要な箇所だけhono/jsx/domでhydrateする。",
          render: Slide_motion_1
        },
        {
          index: 2,
          meta: {
            "title": "Queued navigation",
            "layout": "motion",
            "notes": "入力をロックするのではなく、遷移中の連続入力を最新の行き先へ畳み込む。",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "入力をロックするのではなく、遷移中の連続入力を最新の行き先へ畳み込む。",
          render: Slide_motion_2
        }
      ]
    },
    {
      slug: "sample",
      sourcePath: "decks/sample/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "Hono Slides",
        "description": "Hono + Cloudflare Workersで届ける、アプリと一体化したMDXスライド",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "slide-left",
        "transitionDuration": "360ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "hono",
          "cloudflare",
          "mdx"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #fff8f3;\n  --hono-decks-muted-color: #d4c6bd;\n  --hono-decks-accent-color: #ff6b2c;\n  --hono-decks-border-color: rgba(255, 248, 243, 0.2);\n  --hono-decks-card-background: #1b1d22;\n  --hono-decks-inline-code-background: rgba(255, 107, 44, 0.16);\n  --hono-decks-code-background: #090a0c;\n  font-family: \"Avenir Next\", \"Hiragino Sans\", \"Yu Gothic\", ui-sans-serif, sans-serif;\n}\n\n.slide {\n  position: relative;\n  background: #111216;\n  color: var(--hono-decks-color);\n}\n\n.slide::before {\n  position: absolute;\n  inset: 0 0 auto;\n  height: 12px;\n  background: var(--hono-decks-accent-color);\n  content: \"\";\n}\n\n.slide .hono-decks-slide-content {\n  position: relative;\n  z-index: 1;\n  box-sizing: border-box;\n  padding: 1.9rem 2.4rem;\n}\n\n.slide h1,\n.slide h2,\n.slide h3 {\n  letter-spacing: -0.04em;\n  text-wrap: balance;\n}\n\n.slide h1 {\n  margin: 0;\n  font-size: 4.5rem;\n  line-height: 0.92;\n}\n\n.slide h2 {\n  max-width: 16ch;\n  margin: 0;\n  font-size: 2.65rem;\n  line-height: 1;\n}\n\n.sample-cover {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) 11rem;\n  gap: 2rem;\n  align-items: center;\n}\n\n.sample-context {\n  margin: 0 0 0.8rem;\n  color: #ff9a6e;\n  font-size: 0.78rem;\n  font-weight: 720;\n}\n\n.sample-lede {\n  margin: 1rem 0 0;\n  color: var(--hono-decks-muted-color);\n  font-size: 1.22rem;\n  line-height: 1.42;\n}\n\n.sample-mark {\n  display: grid;\n  width: 10rem;\n  height: 10rem;\n  place-items: center;\n  background: var(--hono-decks-accent-color);\n  color: #111216;\n  font-size: 6rem;\n  font-weight: 820;\n  letter-spacing: -0.08em;\n  line-height: 1;\n  transform: rotate(4deg);\n}\n\n.sample-runtime {\n  display: flex;\n  gap: 0.65rem;\n  margin-top: 1.25rem;\n  color: #fff8f3;\n  font-size: 0.66rem;\n}\n\n.sample-runtime span,\n.sample-route-list code,\n.sample-component-proof > * {\n  border: 1px solid var(--hono-decks-border-color);\n  border-radius: 999px;\n  padding: 0.28rem 0.56rem;\n}\n\n.layout-cover .mdx-hero {\n  position: absolute;\n  right: 2.4rem;\n  bottom: 1.9rem;\n  display: block;\n  width: 10rem;\n  height: auto;\n}\n\n.layout-cover .mdx-hero h1 {\n  color: #ff9a6e;\n  font-size: 0.7rem;\n  letter-spacing: 0;\n}\n\n.sample-component-proof {\n  position: absolute;\n  bottom: 1.8rem;\n  left: 2.4rem;\n  display: flex;\n  max-width: 35rem;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n  align-items: center;\n}\n\n.sample-component-proof .sample-badge,\n.sample-component-proof .sample-counter {\n  margin: 0;\n  border: 1px solid var(--hono-decks-border-color);\n  border-radius: 999px;\n  background: transparent;\n  color: #fff8f3;\n  font-size: 0.56rem;\n  font-weight: 650;\n}\n\n.sample-component-proof .sample-badge {\n  padding: 0.25rem 0.48rem;\n}\n\n.sample-component-proof .sample-counter {\n  padding: 0.18rem 0.3rem 0.18rem 0.46rem;\n}\n\n.sample-component-proof button {\n  min-width: 1.6rem;\n  min-height: 1.2rem;\n  border: 0;\n  border-radius: 999px;\n  background: var(--hono-decks-accent-color);\n  color: #111216;\n  font: inherit;\n}\n\n.sample-subtitle {\n  max-width: 38ch;\n  margin: 0.7rem 0 1.25rem;\n  color: var(--hono-decks-muted-color);\n  font-size: 0.92rem;\n}\n\n.sample-pipeline {\n  display: grid;\n  grid-template-columns: 1fr auto 1fr auto 1fr;\n  gap: 0.7rem;\n  align-items: center;\n}\n\n.sample-pipeline section {\n  min-height: 6.6rem;\n  border-top: 3px solid var(--hono-decks-accent-color);\n  background: #1b1d22;\n  padding: 0.75rem;\n}\n\n.sample-pipeline > span {\n  color: #ff9a6e;\n  font-size: 1.4rem;\n}\n\n.sample-pipeline strong {\n  color: #ff9a6e;\n  font-size: 0.66rem;\n}\n\n.sample-pipeline h3 {\n  margin: 0.45rem 0 0.2rem;\n  font-size: 1.18rem;\n}\n\n.sample-pipeline p {\n  margin: 0;\n  color: var(--hono-decks-muted-color);\n  font-size: 0.68rem;\n}\n\n.sample-asset {\n  position: absolute;\n  right: 2.4rem;\n  bottom: 1.9rem;\n  width: 8rem;\n  max-height: 3.2rem;\n  object-fit: contain;\n  opacity: 0.72;\n}\n\n.layout-statement .hono-decks-slide-content {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}\n\n.layout-statement h2 {\n  max-width: 18ch;\n  font-size: 3.25rem;\n}\n\n.sample-route-list {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-top: 1.4rem;\n}\n\n.sample-route-list code {\n  background: #1b1d22;\n  color: #ff9a6e;\n  font-size: 0.68rem;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .sample-mark {\n    transform: none;\n  }\n}\n",
      "themeSourcePath": "decks/sample/theme.css",

      assets: [
        {
          "sourcePath": "decks/sample/assets/r2-cache.svg",
          "publicPath": "/decks/sample/assets/r2-cache.svg",
          "type": "local",
          "contentType": "image/svg+xml",
          "body": new Uint8Array([60, 115, 118, 103, 32, 120, 109, 108, 110, 115, 61, 34, 104, 116, 116, 112, 58, 47, 47, 119, 119, 119, 46, 119, 51, 46, 111, 114, 103, 47, 50, 48, 48, 48, 47, 115, 118, 103, 34, 32, 118, 105, 101, 119, 66, 111, 120, 61, 34, 48, 32, 48, 32, 49, 54, 48, 32, 57, 48, 34, 32, 114, 111, 108, 101, 61, 34, 105, 109, 103, 34, 32, 97, 114, 105, 97, 45, 108, 97, 98, 101, 108, 108, 101, 100, 98, 121, 61, 34, 116, 105, 116, 108, 101, 32, 100, 101, 115, 99, 34, 62, 10, 32, 32, 60, 116, 105, 116, 108, 101, 32, 105, 100, 61, 34, 116, 105, 116, 108, 101, 34, 62, 82, 50, 32, 99, 97, 99, 104, 101, 100, 32, 97, 115, 115, 101, 116, 60, 47, 116, 105, 116, 108, 101, 62, 10, 32, 32, 60, 100, 101, 115, 99, 32, 105, 100, 61, 34, 100, 101, 115, 99, 34, 62, 65, 32, 108, 111, 99, 97, 108, 32, 100, 101, 99, 107, 32, 105, 109, 97, 103, 101, 32, 105, 110, 116, 101, 110, 100, 101, 100, 32, 116, 111, 32, 98, 101, 32, 115, 101, 114, 118, 101, 100, 32, 102, 114, 111, 109, 32, 97, 110, 32, 82, 50, 32, 98, 105, 110, 100, 105, 110, 103, 32, 105, 110, 32, 112, 114, 111, 100, 117, 99, 116, 105, 111, 110, 46, 60, 47, 100, 101, 115, 99, 62, 10, 32, 32, 60, 100, 101, 102, 115, 62, 10, 32, 32, 32, 32, 60, 108, 105, 110, 101, 97, 114, 71, 114, 97, 100, 105, 101, 110, 116, 32, 105, 100, 61, 34, 115, 107, 121, 34, 32, 120, 49, 61, 34, 48, 34, 32, 120, 50, 61, 34, 49, 34, 32, 121, 49, 61, 34, 48, 34, 32, 121, 50, 61, 34, 49, 34, 62, 10, 32, 32, 32, 32, 32, 32, 60, 115, 116, 111, 112, 32, 111, 102, 102, 115, 101, 116, 61, 34, 48, 34, 32, 115, 116, 111, 112, 45, 99, 111, 108, 111, 114, 61, 34, 35, 48, 101, 97, 53, 101, 57, 34, 32, 47, 62, 10, 32, 32, 32, 32, 32, 32, 60, 115, 116, 111, 112, 32, 111, 102, 102, 115, 101, 116, 61, 34, 49, 34, 32, 115, 116, 111, 112, 45, 99, 111, 108, 111, 114, 61, 34, 35, 50, 50, 99, 53, 53, 101, 34, 32, 47, 62, 10, 32, 32, 32, 32, 60, 47, 108, 105, 110, 101, 97, 114, 71, 114, 97, 100, 105, 101, 110, 116, 62, 10, 32, 32, 60, 47, 100, 101, 102, 115, 62, 10, 32, 32, 60, 114, 101, 99, 116, 32, 119, 105, 100, 116, 104, 61, 34, 49, 54, 48, 34, 32, 104, 101, 105, 103, 104, 116, 61, 34, 57, 48, 34, 32, 114, 120, 61, 34, 49, 48, 34, 32, 102, 105, 108, 108, 61, 34, 117, 114, 108, 40, 35, 115, 107, 121, 41, 34, 32, 47, 62, 10, 32, 32, 60, 112, 97, 116, 104, 32, 100, 61, 34, 77, 50, 56, 32, 54, 50, 104, 49, 48, 52, 34, 32, 115, 116, 114, 111, 107, 101, 61, 34, 35, 101, 99, 102, 101, 102, 102, 34, 32, 115, 116, 114, 111, 107, 101, 45, 119, 105, 100, 116, 104, 61, 34, 52, 34, 32, 115, 116, 114, 111, 107, 101, 45, 108, 105, 110, 101, 99, 97, 112, 61, 34, 114, 111, 117, 110, 100, 34, 32, 111, 112, 97, 99, 105, 116, 121, 61, 34, 46, 56, 56, 34, 32, 47, 62, 10, 32, 32, 60, 112, 97, 116, 104, 32, 100, 61, 34, 77, 52, 50, 32, 52, 56, 104, 55, 54, 34, 32, 115, 116, 114, 111, 107, 101, 61, 34, 35, 101, 99, 102, 101, 102, 102, 34, 32, 115, 116, 114, 111, 107, 101, 45, 119, 105, 100, 116, 104, 61, 34, 52, 34, 32, 115, 116, 114, 111, 107, 101, 45, 108, 105, 110, 101, 99, 97, 112, 61, 34, 114, 111, 117, 110, 100, 34, 32, 111, 112, 97, 99, 105, 116, 121, 61, 34, 46, 55, 50, 34, 32, 47, 62, 10, 32, 32, 60, 99, 105, 114, 99, 108, 101, 32, 99, 120, 61, 34, 53, 50, 34, 32, 99, 121, 61, 34, 51, 48, 34, 32, 114, 61, 34, 49, 50, 34, 32, 102, 105, 108, 108, 61, 34, 35, 102, 101, 102, 51, 99, 55, 34, 32, 47, 62, 10, 32, 32, 60, 116, 101, 120, 116, 32, 120, 61, 34, 56, 48, 34, 32, 121, 61, 34, 51, 53, 34, 32, 116, 101, 120, 116, 45, 97, 110, 99, 104, 111, 114, 61, 34, 109, 105, 100, 100, 108, 101, 34, 32, 102, 111, 110, 116, 45, 102, 97, 109, 105, 108, 121, 61, 34, 65, 114, 105, 97, 108, 44, 32, 115, 97, 110, 115, 45, 115, 101, 114, 105, 102, 34, 32, 102, 111, 110, 116, 45, 115, 105, 122, 101, 61, 34, 49, 50, 34, 32, 102, 111, 110, 116, 45, 119, 101, 105, 103, 104, 116, 61, 34, 55, 48, 48, 34, 32, 102, 105, 108, 108, 61, 34, 35, 48, 56, 50, 102, 52, 57, 34, 62, 82, 50, 60, 47, 116, 101, 120, 116, 62, 10, 60, 47, 115, 118, 103, 62, 10])
        }
      ],
      componentRegistry: withClientComponentIds(Components_sample, {
        "Counter": "Counter__sample_1pkyc19"
      }),
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Hono Slides",
            "layout": "cover",
            "notes": "hono-decksが「スライド専用サービス」ではなく、Honoアプリへ組み込むルートキットであることを最初に伝える。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "hono-decksが「スライド専用サービス」ではなく、Honoアプリへ組み込むルートキットであることを最初に伝える。\n\nIntroduce the clean projection route for talks.",
          render: Slide_sample_0
        },
        {
          index: 1,
          meta: {
            "title": "Build once, mount everywhere",
            "layout": "pipeline",
            "notes": "Node側でMDXを変換し、Workerには生成済みのHono JSXだけを渡す境界を説明する。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "Node側でMDXを変換し、Workerには生成済みのHono JSXだけを渡す境界を説明する。\n\nUse the presenter route for notes and next-slide preview.",
          render: Slide_sample_1
        },
        {
          index: 2,
          meta: {
            "title": "Own the whole presentation",
            "layout": "statement",
            "notes": "viewer、projection、presenter、printを同じデッキソースから提供できることを締めとして示す。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "viewer、projection、presenter、printを同じデッキソースから提供できることを締めとして示す。\n\nClose with the V1 extension points: viewer, projection, presenter, and assets.",
          render: Slide_sample_2
        }
      ]
    }
  ]
});

export function createDecks<E extends Env = any>(config: DecksConfig<E>): ConfiguredDecks<E> {
  return configureDecks(definedDecksFor<E>(), config);
}

function definedDecksFor<E extends Env>() {
  return generatedDecks;
}
