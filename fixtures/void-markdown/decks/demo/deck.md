<script>
import Callout from "./Callout.tsx" with { component: "static" };
</script>
---
title: Void Markdown Demo
transition: fade
---
# Markdown でスライドを書く

:::component Callout title="Hono Markdown"
静的な **TSX コンポーネント**を使えます。
:::

![Logo](./assets/logo.svg)

---
title: Code and notes
notes: 発表者だけが読むノートです。
---
# コードとコンテナ

```ts
const message = "Hono Markdown";
```

:::tip ヒント
コードのコピーを試してください。
:::
