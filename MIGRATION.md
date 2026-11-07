# Migrating to hono-decks 2.0

English | [日本語](#日本語)

hono-decks 2.0 separates build settings from runtime options, makes the generated module the only runtime entry point, and removes APIs that bypassed it. Most apps change two files.

## 1. Move runtime options out of `hono-decks.config.ts`

The config file is now build-only (`mountPath` and `build`). The CLI rejects `router` and `source` there with an error that points to this guide.

```diff
 // hono-decks.config.ts
 import { defineDecksConfig } from "hono-decks";

-export default defineDecksConfig<AppEnv>({
+export default defineDecksConfig({
   mountPath: "/decks",
   build: { root: "decks", outDir: "src/generated" },
-  source: (source) => withR2Assets(source, { bucket: (c) => c.env.DECK_ASSETS }),
-  router: {
-    presenter: { enabled: ({ dev }) => dev },
-  },
 });
```

```diff
 // src/decks.ts
-import config from "../hono-decks.config";
 import { createDecks } from "./generated/decks";

-export const decks = createDecks(config);
+export const decks = createDecks<AppEnv>({
+  source: (source) => withR2Assets(source, { bucket: (c) => c.env.DECK_ASSETS }),
+  presenter: { enabled: ({ dev }) => dev },
+});
```

Everything that used to sit under `router:` moves to the top level of the `createDecks()` options. The type parameter moves from `defineDecksConfig<E>` to `createDecks<E>`.

## 2. Vite, HonoX, and Void apps

`virtual:hono-decks` no longer exports a ready-made `decks`. Create it with your options:

```diff
-export { decks } from "virtual:hono-decks";
+import { createDecks } from "virtual:hono-decks";
+
+export const decks = createDecks({ /* runtime options */ });
```

The plugin no longer resolves imports of the old physical path (`./generated/decks`) to virtual modules; import `virtual:hono-decks` instead.

HonoX apps no longer copy HonoX's route glob. Delete the integration file that called `import.meta.glob` and use the virtual module:

```ts
// app/server.ts
/// <reference types="hono-decks/vite-env" />
import { createApp } from "honox/server";
import { withHonoXDecks } from "virtual:hono-decks/honox";
import { decks } from "./decks";

export default createApp(withHonoXDecks({ /* HonoX options */ }, decks.router()));
```

## 3. Renamed and removed options

| 1.x | 2.0 |
| --- | --- |
| `clientEntry` | `client: { url }` |
| `clientEntryAssetPath` | `client: { path }` (default is now `/_assets/client`) |
| `clientEntryAsset` | set by the compiler (`client.bundle` in `hono-decks/advanced`) |
| `liveReloadPath(slug, mountPath)` | `liveReloadPath: string` (set by the Vite plugin) |
| `defineDecks()` + `configureDecks(defined, config)` | `configureDecks({ mountPath, decks }, options)` in `hono-decks/advanced` |
| `deckMiddleware`, `renderDeckPage`, `renderDeck`, `renderSlide` | removed; compile decks and use `decksRouter` or `createDecks` |
| `createLocalDevSlidesApp`, `createDevDeckRuntime`, `createPreviewEventHub` | removed; use the Vite plugin or `hono-decks compile --watch` |
| `writeDecksRouterModule`, `emitDecksRouterModule` | removed; `compileDecks()` emits the module |
| `hono-decks init --generated` | removed; the facade import is derived from `build.outDir` |
| Node APIs re-exported from `hono-decks/advanced` | import them from `hono-decks/node` |

## 4. Behavior changes

- **Mount path is enforced.** A router created by `createDecks()` throws when it receives a request outside the compiled `mountPath`. Mount it with `app.route(decks.mountPath, decks.router())`.
- **404s go to your app.** Missing decks, production drafts, and disabled pages return `c.notFound()` instead of a JSON body, so `app.notFound()` renders them.
- **Router overrides follow one merge rule.** Objects merge recursively, arrays concatenate, and other values (including `false` and functions) replace.
- **Only the first slide defaults to `layout: cover`.** Later slides without a `layout` now use `default`. Add `layout: cover` to any later slide that relied on the old fallback.
- **The opening frontmatter can style the first slide.** `layout`, `class`, `notes`, and `background` in the deck's opening block apply to the first slide, so a cover no longer needs a second frontmatter block.
- **Generated files are not committed.** `init` adds `/src/generated/` to `.gitignore`. Delete committed generated files and let `hono-decks compile` (or Wrangler's `build.command`) recreate them.

---

## 日本語

hono-decks 2.0 では、ビルド設定とランタイムのオプションを分け、生成モジュールの `createDecks()` を唯一の入口にしました。それを迂回していた API は削除しています。多くのアプリで変更が必要なのは 2 ファイルです。

### 1. ランタイムのオプションを `hono-decks.config.ts` から移す

config ファイルはビルド専用(`mountPath` と `build`)になりました。`router` や `source` を書くと、CLI がこのガイドを案内するエラーを出します。`router:` の下にあった項目は `createDecks()` のオプションの最上位へ移し、型パラメーターも `defineDecksConfig<E>` から `createDecks<E>` へ移します(差分は英語版の例を参照してください)。

### 2. Vite・HonoX・Void のアプリ

`virtual:hono-decks` は作成済みの `decks` を export しなくなりました。`createDecks()` を import し、オプションを渡して作成してください。古い物理パス(`./generated/decks`)への import を仮想モジュールに読み替える動作も削除しました。

HonoX では、HonoX のルート探索 glob をアプリ側にコピーする必要がなくなりました。`import.meta.glob` を書いていた連携ファイルを削除し、`virtual:hono-decks/honox` の `withHonoXDecks(options, decks.router())` を使います。

### 3. 名前の変更と削除

英語版の表を参照してください。主な変更は `clientEntry` 系 3 項目の `client: { url, path }` への統合(既定パスは `/_assets/client`)、旧ランタイム Markdown 経路(`deckMiddleware` など)と旧開発ランタイムの削除、`hono-decks/advanced` からの Node 専用 API の除外です。

### 4. 動作の変更

- **mountPath を検査します。** `createDecks()` の router は、コンパイル時の `mountPath` 以外で受けたリクエストに対して例外を投げます。
- **404 はアプリに任せます。** デッキが無い・本番の下書き・無効なページは JSON ではなく `c.notFound()` を返し、`app.notFound()` が表示を決めます。
- **router の上書きのマージ規則を一つにしました。** オブジェクトは再帰的にマージ、配列は連結、それ以外(`false` や関数を含む)は置き換えです。
- **`layout: cover` が既定になるのは最初のスライドだけです。** 2 枚目以降で `layout` を省略すると `default` になります。従来の挙動に頼っていたスライドには `layout: cover` を追加してください。
- **最初のフロントマターで 1 枚目を指定できます。** デッキ冒頭のブロックに書いた `layout`・`class`・`notes`・`background` は 1 枚目に適用されます。
- **生成ファイルはコミットしません。** `init` が `.gitignore` に `/src/generated/` を追加します。コミット済みの生成ファイルは削除し、`hono-decks compile`(または Wrangler の `build.command`)で再生成してください。


## Managed CLI cache and cf examples

New generic init uses `decks/index.ts` and registers `#decks` in package.json,
pointing to the ignored `.hono-decks/` cache. Existing dev/build/typecheck/test/deploy
scripts are preserved and prefixed with compilation. Vite continues to use
`virtual:hono-decks` without writing generated modules to disk.

Existing applications with explicit `build.outDir` and physical imports keep
working. To opt into the cache layout, set `build.outDir: ".hono-decks"`, add
`"imports": { "#decks": "./.hono-decks/decks.ts" }` to package.json, replace the
physical import with `#decks`, and ignore `.hono-decks/`. Retain an automatic
compilation hook before build/dev/typecheck and the source watcher during dev.

Basic, Minimal, and OGP now use `cf dev`, `cf build`, and `cf deploy`.
The maintained production targets require `--mode production`.
`cloudflare.config.ts` owns deployment identities and bindings;
`wrangler.config.ts` retains the bundler settings delegated to by cf.

新しいCLIのinitでは、アプリ側の設定を `decks/index.ts` に置き、
package.jsonの `#decks` 経由で内部キャッシュを読み込みます。
既存の `build.outDir` と物理importはそのまま利用できます。
上記の手順でキャッシュ構成へ移行できます。Basic・Minimal・OGPの
公開設定は `cf deploy --mode production` で選択します。

Generic CLI init keeps build settings in `decks/config.ts` and runtime settings in `decks/index.ts`. package.json `hono-decks.configFile` records the build config path, so ordinary compile commands need no path argument. Explicit `--config` takes precedence; existing root configs still work.
