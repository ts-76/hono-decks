# Minimal Hono example

`@hono/decks`を通常のHono Workerへ組み込む最小構成です。1つのdeckをbuild時にcompileし、生成されたrouterを`/decks`へmountします。

```bash
bun run --cwd examples/minimal dev
```

確認先:

- `/` — `/decks/welcome`へredirect
- `/decks` — deck index
- `/decks/welcome` — viewer
- `/decks/welcome/render` — slide renderer

`src/decks.ts`は編集可能なfacadeです。`src/generated`以下は`bun run decks:compile`で上書きされます。
