# 残件一覧

beads に登録されている open Issue と、`.takt` 最新セッションの残件・引き継ぎ事項を突き合わせた一覧（一覧＋概要）。各残件は ID・タイトル・概要・ステータス・優先度の5項目で整理し、beads 由来 / `.takt` 由来をセクションで区別する。

**生成基準:**

- beads データ: `bd list --status=open` と `bd show <id>`（取得時点で `Total: 2 issues (2 open, 0 in progress)`）
- `.takt` 最新セッション: `.takt/runs/` 配下各 `meta.json` の `startTime` を比較し、進行中の本タスク run を除外した最新の完了済み run = `20260623-083536-task`（`status: aborted`、`startTime: 2026-06-23T08:35:36Z`）。残件は同 run の `reports/plan.md` と `git status` から抽出
- 優先度は beads の値（P0〜P4）をそのまま記載。beads 値を持たない `.takt` 由来残件は `—`（未設定）とする

## 1. beads 由来の残件

| ID | タイトル | 概要 | ステータス | 優先度 |
|----|---------|------|-----------|--------|
| hono-slides-uuo | Verify deployed R2 smoke after custom domain DNS provisioning | カスタムドメイン解決後に `bun run --cwd examples/basic smoke:r2-cache -- --origin https://hono-decks-basic.tslab.app` を実行する。Worker デプロイは成功し remote R2 オブジェクトもアップロード済みだが、現状 smoke は DNS ENOTFOUND で失敗する。 | open (task) | P1 |
| hono-slides-owa | Stabilize compile-time OGP metadata generation | コンパイル時 LinkCard OGP フェッチがネットワーク可否で生成スライド出力を変える。決定的なキャッシュ・フィクスチャ・opt-in リフレッシュ経路を追加し、生成例を安定させつつ OGP metadata を実演できるようにする。 | open (task) | P2 |

## 2. `.takt` 由来の残件（最新セッション: `20260623-083536-task`）

| ID | タイトル | 概要 | ステータス | 優先度 |
|----|---------|------|-----------|--------|
| takt-083536-1 | decks パッケージのファイル分割リファクタリング（未コミット） | `packages/decks/` で `compiler.ts`・`compiled-render.ts` 等が変更され、新規ファイル `deck/assets.ts`・`deck/frontmatter.ts`・`generator/assets.ts`・`renderer/asset-rewrite.ts`・`renderer/presentation-{page,script,style}.ts`・`server/viewer-{script,style}.ts` 等が未追跡（`??`）。`git status` で継続を確認。 | 進行中（未コミット） | — |
| takt-083536-2 | 指示書本文の欠落によるセッション中断（引き継ぎ事項） | タスク本文が「上記指示書で始めてください」のみで要件が渡されず、計画を確定できないまま abort。本来の指示書本文または対象タスクの指定があれば再開可能。 | 中断（要再指示） | — |
