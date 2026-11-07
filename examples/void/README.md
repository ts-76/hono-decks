# Void + hono-decks サンプル

Void のルートから hono-decks を配信し、トップページに同一オリジンの iframe でスライドを埋め込みます。公開先は `https://void.hono-decks.com` です。`https://hono-decks.com` のドキュメントからも埋め込めます。

ソースは [hono-decks の examples/void](https://github.com/ts-76/hono-decks/tree/main/examples/void) で管理します。hono-decks 2.0.0を使用し、既存のWorkerとドメイン、公開URLを維持します。

## 起動と確認

Node.js 24.22.1 以降の 24 系と npm 11.19.1 を使います。このディレクトリはルートの Bun ワークスペースとは独立した npm サンプルです。`package-lock.json` をコミットし、依存の導入には `npm ci` を使います。

```sh
cd examples/void
npm ci
npm run typecheck
npm run build
npm run dev
```

`http://127.0.0.1:5197/` を開きます。`npm run preview` はビルドした Worker を `http://127.0.0.1:4197/` で確認します。Vite+ がある場合は、各 npm コマンドを `vp env exec --node 24.22.1 --package-manager npm@11.19.1 npm ...` で実行できます。

Void 1.5.0 の Drizzle CLI が依存する `@esbuild-kit/core-utils` に限り、`overrides` で esbuild を `0.25.12` に固定しています。元の `0.18.20` は開発サーバーの既知の脆弱性（[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)）に該当します。古い変換アダプターの要求範囲を超えるため、更新時には通常の型検査・ビルドに加えて TypeScript の同期・非同期変換と Drizzle の設定読込・SQL生成を確認してください。Void 側の依存更新で解消されたら、この限定 override を削除できます。

## 構成と埋め込み

- `decks/welcome/deck.mdx`: スライドの内容。Vite プラグインが開発時に変更を監視します。
- `hono-decks.config.ts`: ビルド専用のマウントパスとコンパイル先。
- `lib/decks.ts`: 仮想モジュールのcreateDecks()で埋め込み・ページ設定を指定し、Honoルーターを接続。
- `routes/slides/[...path].ts`: Void の catch-all から Hono ルーターへリクエストを渡す。
- `routes/index.ts`: `decks.paths()` で取得した相対 URL を iframe に指定。

`npm run typecheck` は `void prepare` で `.void/tsconfig.json` を用意し、仮想モジュールの型を使って型検査します。開発・ビルド時は `hono-decks/vite` が仮想モジュールを生成します。生成物は直接編集しません。

埋め込み用の `/slides/welcome/embed` は CSP の `frame-ancestors` で自サイトと `https://hono-decks.com` だけを許可します。他のサブドメインや任意の外部サイトは許可しません。CSP はブラウザの埋め込み制限であり、公開スライドへのアクセス認証ではありません。プレゼンター、印刷、プレゼンテーション、エクスポートは提供しません。

ドキュメント側には次の iframe を置きます。公開先の変更や再デプロイ後は、公開 URL とブラウザでの埋め込みを確認します。

```html
<iframe
  src="https://void.hono-decks.com/slides/welcome/embed"
  title="Void + hono-decks サンプル"
  style="width:100%;aspect-ratio:16/9;border:0"
  allowfullscreen
></iframe>
```

## カスタムドメインの公開手順

この例を自分のアカウントへ公開する場合は、先に `void.config.ts` の `cloudflare.name` を自分の一意な Worker 名へ変更し、`cloudflare.routes` の `void.hono-decks.com` を自分が管理するドメインへ変更してください。カスタムドメインが不要なら `routes` を削除して `workers.dev` を利用できます。変更した Worker 名は `void.lock.json` の `source.name`、`resolved.name`、`text` 内の `name` にも反映してください。公開先の Cloudflare アカウントを明示してからデプロイします。この例の lockfile は特定の `account_id` を固定していません。

公開先は既存の `hono-decks-docs` とは別の Cloudflare Worker `void-hono-decks-example` です。設定は `void.config.ts` を編集し、`.void-wrangler.jsonc` やビルド出力を編集しません。`cloudflare.routes` に `void.hono-decks.com` を Custom Domain として設定しています。既存の `workers.dev` URL は有効のまま保持し、バージョンのプレビュー URL は無効にしています。デプロイ時にカスタムドメインの割り当てが反映されます。

1. Cloudflare の対象アカウント（既存 docs と同じ運用なら `tsapp`）と既存ルート・ドメインを確認し、`void-hono-decks-example` が別用途の既存 Worker と衝突しないことを確かめます。`void.hono-decks.com` が別の Worker、ルート、DNS レコードで使われていないことも確認します。衝突する場合は公開を止めて所有者と調整します。既存ドキュメント Worker に上書きしません。
2. このディレクトリで `npm ci`、`npm run typecheck`、`npm run build` を実行し、ローカルプレビューを確認します。
3. 公開を承認した担当者だけが `npx void deploy --platform cloudflare` を実行します。Void はリソースの準備、ビルド、アップロード、トラフィック更新を行います。初回公開は準備段階で実リソースを作る場合があります。
4. DNS と TLS の反映後、`https://void.hono-decks.com` で `/`、`/slides/welcome`、`/slides/welcome/embed`、`/slides/welcome/render` と参照する JS/CSS を確認します。`/embed` の CSP が `frame-ancestors 'self' https://hono-decks.com` であることと、無効なサーフェスが 404 になることを確認します。
5. 自サイトのトップページと `hono-decks.com` で iframe、左右キー、全画面、モバイル表示を確認し、それ以外のオリジンの iframe がブラウザで拒否されることを確認してからドキュメントに掲載します。

アカウント情報やトークンをコミットしません。`.void/`、`.wrangler/`、`.env*`、`.dev.vars*` は除外しています。`void.lock.json` はリソース ID やマイグレーションを記録した場合も保持し、公開後に変更された内容を確認してコミットします。

Void 1.5.0 同梱の `docs/integrations/cloudflare.md`、`docs/reference/config.md`、`docs/reference/cli/deploy.md` に基づく手順です。`cloudflare` の設定は `void.lock.json` の記録より優先されます。`void domain` はルートを即時変更するため、この準備では実行しません。公開操作、本番 URL とドキュメント側 iframe の実表示は別途確認が必要です。
