/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export function APIReference({
  name,
  id,
  importFrom,
  description,
  usage,
  guideHref,
  sourceHref,
  labels,
  children,
}: {
  name: string;
  id?: string;
  importFrom?: string;
  description?: Child;
  usage?: Child;
  guideHref?: string;
  sourceHref?: string;
  labels?: { usage?: string; guide?: string; source?: string; links?: string };
  children?: Child;
}) {
  return (
    <article class="hx-api-reference" id={id} aria-label={name}>
      <header class="hx-api-heading">
        <h3>
          <code>{name}</code>
        </h3>
        {importFrom ? (
          <span class="hx-api-entry">
            <code>{importFrom}</code>
          </span>
        ) : null}
      </header>
      {description ? <div class="hx-api-description">{description}</div> : null}
      {usage ? (
        <div class="hx-api-usage">
          <strong>{labels?.usage ?? "Use it when"}</strong>
          <div>{usage}</div>
        </div>
      ) : null}
      <div class="hx-api-content">{children}</div>
      {guideHref || sourceHref ? (
        <nav class="hx-api-links" aria-label={labels?.links ?? `${name} links`}>
          {guideHref ? <a href={guideHref}>{labels?.guide ?? "Guide"}</a> : null}
          {sourceHref ? <a href={sourceHref}>{labels?.source ?? "Source"}</a> : null}
        </nav>
      ) : null}
    </article>
  );
}
