# HonoX example

HonoXのfile-based routingと`hono-decks`の生成routerを同じCloudflare Workerへ組み込む例です。公式`x-basic`構成に合わせ、`honox/vite`、Cloudflare dev adapter、Cloudflare build adapterを使用します。`hono-decks`の標準entry自体がruntime-safeなので、HonoX固有のVite aliasやsubpath importは不要です。

```bash
bun run --cwd examples/honox dev
```

確認先:

- `/` — HonoXのfile route
- `/decks` — `app/routes/decks/index.ts`からmountしたdeck index
- `/decks/honox` — viewer
- `/decks/honox/render` — slide renderer

`hono-decks.config.ts`がcompileとmount pathの共通設定です。`app/decks.ts`は編集可能なfacade、`app/generated`以下は自動生成です。`bun run dev`を起動するとVite pluginが初回compileとMDX変更の監視を行います。
