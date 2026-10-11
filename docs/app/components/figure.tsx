/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

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
    <figure class="hx-figure">
      <div class="hx-figure-media">
        <img src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" />
      </div>
      {caption ? <figcaption class="hx-figure-caption">{caption}</figcaption> : null}
    </figure>
  );
}
