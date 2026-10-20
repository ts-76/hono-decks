import type { Child } from "hono/jsx";
import { useFrontmatter } from "void-plugin-hono-jsx/markdown";
export default function Callout({ title, children }: { title?: string; children?: Child }) {
  const meta = useFrontmatter<{ title: string }>();
  return (
    <aside class="demo-callout" data-context-title={meta.title}>
      <strong>{title}</strong>
      {children}
    </aside>
  );
}
