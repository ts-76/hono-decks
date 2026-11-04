/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const figureStyles = css`
  :-hono-global {
    @layer documentation {
      .hx-figure {
        margin: var(--docs-block-gap) 0;
      }
      .hx-figure-media {
        overflow: hidden;
        border: 1px solid var(--docs-line);
        border-radius: var(--docs-radius);
        background: var(--docs-panel);
      }
      .hx-figure-media img {
        display: block;
        width: 100%;
        height: auto;
        margin: 0;
      }
      .hx-figure-caption {
        margin-block-start: var(--docs-space-2);
        font-size: var(--docs-ui-size);
        line-height: var(--docs-leading-ui);
        color: var(--docs-muted);
      }
      .hx-figure-caption > :first-child {
        margin-block-start: 0;
      }
      .hx-figure-caption > :last-child {
        margin-block-end: 0;
      }
    }
  }
`;

/** Use intrinsic dimensions to reserve space; images retain their full aspect ratio. */
export function Figure({
  src,
  alt,
  width,
  height,
  caption,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: Child;
  loading?: "lazy" | "eager";
}) {
  return (
    <figure class={html`${figureStyles}hx-figure`}>
      <div class="hx-figure-media">
        <img src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" />
      </div>
      {caption ? <figcaption class="hx-figure-caption">{caption}</figcaption> : null}
    </figure>
  );
}
