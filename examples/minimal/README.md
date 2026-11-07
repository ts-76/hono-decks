# Minimal Hono example

`hono-decks`を通常のHono Workerへ組み込む最小構成です。1つのdeckをbuild時にcompileし、生成されたrouterを`/decks`へmountします。

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fts-76%2Fhono-decks%2Ftree%2Fmain%2Fexamples%2Fminimal)

Cloudflareは`examples/minimal`を新しいリポジトリのrootとして複製し、`bun run deploy`を実行します。このディレクトリだけでinstall、build、deployが完結します。

## Local development

`examples/minimal`から起動する場合:

```bash
bun install --frozen-lockfile
bun run dev
```

monorepoのrootから起動する場合:

```bash
bun run --cwd examples/minimal dev
```

確認先:

- `/` — `/decks/welcome`へredirect
- `/decks` — deck index
- `/decks/welcome` — viewer
- `/decks/welcome/render` — slide renderer

`decks/config.ts`はcompile専用の設定(mount path・デッキの場所・出力先)です。`decks/index.ts`で生成された`createDecks()`にランタイムのオプションを渡します。`.hono-decks`以下は自動生成でGit管理しません。`bun run dev`を起動するとcfのビルドフックが初回compileとMDX変更を監視し、ローカルサーバーを更新します。ブラウザは再読み込みしてください。

`package.json`はnpmで公開されている`hono-decks`を参照します。リポジトリ内のパッケージソースには依存しないため、このディレクトリをCloudflareへ直接デプロイできます。

## cf configuration

Use `cf dev`, `cf build`, and `cf deploy`. Use `cf deploy --mode production` only for the maintained public sample. `cloudflare.config.ts` owns the Worker, production account/domain, and bindings. `wrangler.config.ts` configures the bundler delegated to by cf, including the deck compilation watcher. The ignored `.hono-decks/` cache is recreated automatically; app-owned settings live in `decks/index.ts` and import `#decks`.

The current cf Wrangler backend rebuilds the local Worker on source changes but does not accept the old `--live-reload` flag. Refresh the browser after edits; Vite integrations retain their existing live updates.
