import { defineHandler } from "void";
import { decks } from "../lib/decks";

export const GET = defineHandler((c) => {
  const paths = decks.paths("welcome");
  return c.html(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Void + hono-decks</title>
<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:3rem auto;padding:0 1rem;line-height:1.6}iframe{width:100%;aspect-ratio:16/9;border:1px solid #ddd;border-radius:8px}a{color:#0759a5}</style></head>
<body><h1>Void + hono-decks</h1><p>Void のページにスライドを埋め込んだサンプルです。</p>
<p><a href="${paths.viewer}">スライドを開く</a></p>
<iframe src="${paths.embed}" title="Welcome スライド" allowfullscreen></iframe></body></html>`);
});
