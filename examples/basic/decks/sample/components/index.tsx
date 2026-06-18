import { createCssContext } from "hono/css";
import type { SlideComponentProps } from "@hono/decks";

const { css, Style } = createCssContext({
  id: "sample-deck",
  classNameSlug: (hash, label) => label || hash,
});

const badgeClass = css`
  /* sample-badge */
  display: inline-flex;
  margin-top: 1rem;
  padding: .35rem .6rem;
  border-radius: 8px;
  background: #dff7ff;
  color: #062633;
  font-weight: 700;
`;

export function Badge(props: SlideComponentProps) {
  return (
    <>
      <Style />
      <p class={badgeClass}>{String(props.label)}</p>
    </>
  );
}
