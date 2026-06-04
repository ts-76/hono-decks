# hono-slides

Hono + Cloudflare Workers で動く、Slidev 風の Markdown/MDX-like スライドデック生成 PoC です。

## できること

- `---` 区切りの Markdown をスライドへ変換
- `title/layout/class` などの簡易 frontmatter をスライド単位で指定
- `<Hero title="..." />` のような MDX 風コンポーネント記法を安全なプレースホルダとして描画
- ブラウザ編集ページでライブプレビュー
- `/api/agent/suggest` と Cloudflare Agents の `/agents/slide-assistant/default/suggest` に、AI 編集支援を差し込む口を用意

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:8787` を開きます。

## Cloudflare Agents の差し込み口

この PoC は `agents` SDK の `SlideAssistant` Durable Object を export しています。

- 標準ルート: `/agents/slide-assistant/default/suggest`
- エディタ用 API: `/api/agent/suggest`

`wrangler.toml` では Durable Object binding を設定済みです。Workers AI などを使いたい場合は、`wrangler.toml` の `[ai] binding = "AI"` を有効化し、`src/agent.ts` の `suggestWithWorkersAI()` を好みのモデル/プロンプトに差し替えてください。

## MDX-like 記法

完全な MDX 実行ではなく、Worker 上で安全に扱いやすい subset として実装しています。

```md
---
title: Cover
layout: cover
---

# Hono Slides

<Hero title="Fast decks on Workers" />

---

## Slide 2

- Markdown bullets
- `code`
```

## 品質確認

```bash
npm run check
```
