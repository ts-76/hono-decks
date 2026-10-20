import { useState } from "hono/jsx";
import { useFrontmatter, useMarkdownHeadings } from "void-plugin-hono-jsx/markdown";
import "./counter.css";
export default function Counter({ label = "counter", initial = "0" }: { label?: string; initial?: string }) {
  const [count, setCount] = useState(Number(initial));
  const fm = useFrontmatter<{ title: string }>();
  const headings = useMarkdownHeadings();
  return <button class="md-counter" data-md-counter={label} data-context-title={fm.title} data-context-heading={headings[0]?.text} type="button" onClick={() => setCount(count + 1)}>{label}: {count}</button>;
}
