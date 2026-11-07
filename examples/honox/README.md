# HonoX example

HonoXのfile-based routingと`hono-decks`の生成routerを同じCloudflare Workerへ組み込む例です。公式`x-basic`構成に合わせ、`honox/vite`、Cloudflare dev adapter、Cloudflare build adapterを使用します。`hono-decks`の標準entry自体がruntime-safeなので、HonoX固有のVite aliasやsubpath importは不要です。

```bash
bun run --cwd examples/honox dev
```

確認先:

- `/` — HonoXのfile route
- `/decks` — `mountPath`の設定から登録するdeck index
- `/decks/honox` — viewer
- `/decks/honox/render` — slide renderer

`hono-decks.config.ts`はcompile専用の設定(mount path・デッキの場所)です。`app/decks.ts`で`virtual:hono-decks`の`createDecks()`にランタイムのオプションを渡します。`bun run dev`を起動するとVite pluginが初回compileとMDX変更の監視を行い、成功後にブラウザを自動更新します。

公開パスは `hono-decks.config.ts` の `mountPath` 一か所で変更できます。
`app/server.ts` で `virtual:hono-decks/honox` の `withHonoXDecks()` を使うと、
Vite プラグインが HonoX と同じ規則でルートを探索し、HonoX の公開 ROUTES API にデッキを追加します。
ルート用ディレクトリの作成・改名や glob のコピーは不要で、既存のページと `_middleware.ts` も保持されます。
