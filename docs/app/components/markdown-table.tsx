/** @jsxImportSource hono/jsx */
import type { PropsWithChildren } from "hono/jsx";

/** Keep wide CLI comparisons inside their own horizontal scroll area on phones. */
export function MarkdownTable({ children }: PropsWithChildren) {
  return (
    <div class="hx-markdown-table" tabIndex={0}>
      <table>{children}</table>
    </div>
  );
}
