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
        "description": "Fenced code block rendering checks for hono-decks"
      },
      "themeStyle": ":root {\n  --hono-decks-color: #eef2ff;\n  --hono-decks-muted-color: #cbd5e1;\n  --hono-decks-accent-color: #8bd3ff;\n  --hono-decks-border-color: rgba(148, 163, 184, .24);\n  --hono-decks-card-background: rgba(15, 23, 42, .78);\n  --hono-decks-inline-code-background: rgba(15, 23, 42, .72);\n  --hono-decks-code-background: rgba(15, 23, 42, .78);\n}\n\n.layout-code {\n  background: #0b1020;\n  color: #eef2ff;\n}\n",
      "themeSourcePath": "decks/code/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Fenced Code",
            "layout": "code",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_code_0
        },
        {
          index: 1,
          meta: {
            "title": "CodeBlock Component",
            "layout": "code",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
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
        "description": "Local and remote image asset checks for hono-decks"
      },
      "themeStyle": ":root {\n  --hono-decks-color: #eef2ff;\n  --hono-decks-muted-color: #cbd5e1;\n  --hono-decks-accent-color: #2dd4bf;\n  --hono-decks-border-color: rgba(148, 163, 184, .24);\n  --hono-decks-card-background: rgba(8, 18, 34, .82);\n  --hono-decks-inline-code-background: rgba(15, 23, 42, .72);\n  --hono-decks-code-background: rgba(15, 23, 42, .78);\n}\n\n.layout-media {\n  background: #07111f;\n  color: #eef2ff;\n}\n\n.layout-media .media-image {\n  display: block;\n  width: min(100%, 56rem);\n  max-height: 36rem;\n  object-fit: contain;\n}\n",
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
            "title": "Local JSX Image",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_media_0
        },
        {
          index: 1,
          meta: {
            "title": "R2-backed Image",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_media_1
        },
        {
          index: 2,
          meta: {
            "title": "YouTube Embed",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_media_2
        },
        {
          index: 3,
          meta: {
            "title": "Generic Embed",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_media_3
        },
        {
          index: 4,
          meta: {
            "title": "X Post Embed",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_media_4
        },
        {
          index: 5,
          meta: {
            "title": "Link Card",
            "layout": "media",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
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
        "description": "CSS and client island animation checks for hono-decks",
        "transition": "slide-left",
        "transitionDuration": "420ms",
        "transitionEasing": "cubic-bezier(.2, 0, 0, 1)"
      },
      "themeStyle": ":root {\n  --hono-decks-color: #eef2ff;\n  --hono-decks-muted-color: #cbd5e1;\n  --hono-decks-accent-color: #8bd3ff;\n  --hono-decks-border-color: rgba(148, 163, 184, .24);\n  --hono-decks-card-background: rgba(15, 23, 42, .78);\n  --hono-decks-inline-code-background: rgba(15, 23, 42, .72);\n  --hono-decks-code-background: rgba(15, 23, 42, .78);\n}\n\n.layout-motion {\n  background: #0b1020;\n  color: #eef2ff;\n}\n",
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
            "title": "CSS Animation",
            "layout": "motion",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_motion_0
        },
        {
          index: 1,
          meta: {
            "title": "Client Island Animation",
            "layout": "motion",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_motion_1
        },
        {
          index: 2,
          meta: {
            "title": "Queued Transition",
            "layout": "motion",
            "transition": "slide-left",
            "transitionDuration": "420ms",
            "transitionEasing": "cubic-bezier(.2, 0, 0, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
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
        "description": "Hono + Cloudflare Workers で動く MDX-like slide runtime"
      },
      "themeStyle": ":root {\n  --hono-decks-color: #eef2ff;\n  --hono-decks-muted-color: #cbd5e1;\n  --hono-decks-accent-color: #8bd3ff;\n  --hono-decks-border-color: rgba(148, 163, 184, .24);\n  --hono-decks-card-background: rgba(15, 23, 42, .78);\n  --hono-decks-inline-code-background: rgba(15, 23, 42, .72);\n  --hono-decks-code-background: rgba(15, 23, 42, .78);\n}\n\n.layout-cover,\n.layout-default,\n.layout-statement {\n  background: #0b1020;\n  color: #eef2ff;\n}\n",
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
            "meta": {}
          },
          html: "",
          components: [],
          notes: "Introduce the clean projection route for talks.",
          render: Slide_sample_0
        },
        {
          index: 1,
          meta: {
            "title": "Parse and View",
            "layout": "cover",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "Use the presenter route for notes and next-slide preview.",
          render: Slide_sample_1
        },
        {
          index: 2,
          meta: {
            "title": "次にやること",
            "layout": "statement",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "Close with the V1 extension points: viewer, projection, presenter, and assets.",
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
