/** @jsxImportSource hono/jsx */
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
    <figure class="demo-frame">
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
