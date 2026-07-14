# Minimal Hono example

`hono-decks`を通常のHono Workerへ組み込む最小構成です。1つのdeckをbuild時にcompileし、生成されたrouterを`/decks`へmountします。

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fts-76%2Fhono-slides%2Ftree%2Fmain%2Fexamples%2Fminimal)

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

`src/decks.ts`は編集可能なfacadeです。`src/generated`以下は`bun run decks:compile`で上書きされます。

> `hono-decks`はnpm公開前のため、現在は`vendor/hono-decks-0.1.0.tgz`を参照します。公開後は`package.json`の依存指定をnpm版へ差し替えます。
