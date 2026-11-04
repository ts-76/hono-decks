/** @jsxImportSource hono/jsx */
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const demoFrameStyles = css`
  :-hono-global {
    @layer documentation {
      .demo-frame {
        margin: var(--docs-block-gap) 0;
        border: 1px solid var(--docs-line);
        border-radius: var(--docs-radius);
        overflow: hidden;
      }
      .demo-frame figcaption {
        display: flex;
        align-items: center;
        gap: var(--docs-space-sm);
        padding: var(--docs-space-sm) var(--docs-panel-padding);
        border-bottom: 1px solid var(--docs-line);
        background: var(--docs-surface);
        color: var(--docs-muted);
        font-size: var(--docs-text-xs);
      }
      .demo-title {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .demo-frame figcaption a {
        margin-left: auto;
        min-height: var(--docs-control-height);
        display: inline-flex;
        align-items: center;
        gap: var(--docs-space-xs);
        font-size: var(--docs-ui-size);
        text-decoration: underline;
      }
      .demo-indicator {
        height: 6px;
        width: 6px;
        border-radius: 50%;
        background: var(--docs-tip);
      }
      .demo-frame iframe {
        display: block;
        width: 100%;
        height: 210px;
        border: none;
        background: var(--docs-bg);
      }
      @media (max-width: 760px) {
        .demo-frame figcaption {
          flex-wrap: wrap;
        }
      }
      .demo-frame figcaption a:hover {
        color: var(--docs-accent);
      }
      @media (pointer: coarse) {
        .demo-frame figcaption a {
          min-height: 44px;
        }
      }
    }
  }
`;

// Consumer-owned live demo frame; embedding is a browser request, never an SSG execution.
export default function DemoFrame({
  title = "Live Worker demo",
  src = "/demo/clock",
  href = src,
  linkLabel = "Open live demo",
  aspectRatio,
  height,
  allowFullscreen = false,
  openInNewTab = false,
  loading = "lazy",
}: {
  title?: string;
  src?: string;
  href?: string;
  linkLabel?: string;
  aspectRatio?: number;
  height?: number;
  allowFullscreen?: boolean;
  openInNewTab?: boolean;
  loading?: "lazy" | "eager";
}) {
  for (const [name, value] of [
    ["aspectRatio", aspectRatio],
    ["height", height],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0))
      throw new RangeError(`DemoFrame ${name} must be a finite positive number`);
  }
  const frameStyle =
    height !== undefined
      ? { height: `${height}px` }
      : aspectRatio !== undefined
        ? { aspectRatio: String(aspectRatio), height: "auto" }
        : undefined;
  return (
    <figure class={html`${demoFrameStyles}demo-frame`}>
      <figcaption>
        <span class="demo-indicator" aria-hidden="true" />
        <span class="demo-title">{title}</span>
        <a href={href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noreferrer" : undefined}>
          {linkLabel}
          <span aria-hidden="true"> ↗</span>
        </a>
      </figcaption>
      <iframe
        src={src}
        title={title}
        loading={loading}
        style={frameStyle}
        allow={allowFullscreen ? "fullscreen" : undefined}
      />
    </figure>
  );
}
