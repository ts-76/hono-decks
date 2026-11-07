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

`hono-decks.config.ts`はcompile専用の設定(mount path・デッキの場所・出力先)です。`src/decks.ts`で生成された`createDecks()`にランタイムのオプションを渡します。`src/generated`以下は自動生成でGit管理しません。`bun run dev`を起動するとWrangler custom buildが初回compileとMDX変更を監視し、live reloadでブラウザを自動更新します。

`package.json`はnpmで公開されている`hono-decks`を参照します。リポジトリ内のパッケージソースには依存しないため、このディレクトリをCloudflareへ直接デプロイできます。
