/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { css } from "hono/css";
import { componentClass as html } from "honoxpress";

// Keep defaults below application-layer overrides in this consumer-owned shell.

// Stable selectors keep application overrides at their existing specificity.
const apiReferenceStyles = css`
  :-hono-global {
    @layer documentation {
      .hx-api-reference {
        margin: var(--docs-block-gap) 0;
        padding: var(--docs-space-4) 0;
        border-top: 1px solid var(--docs-line);
        border-bottom: 1px solid var(--docs-line);
      }
      .hx-api-reference + .hx-api-reference {
        border-top: 0;
      }
      .hx-api-heading {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--docs-space-2) var(--docs-space-4);
        margin-bottom: var(--docs-space-3);
      }
      .hx-api-heading h3 {
        margin: 0;
        font-size: var(--docs-title-size);
      }
      .hx-api-heading h3 code,
      .hx-api-entry code {
        border: 0;
        padding: 0;
        background: transparent;
      }
      .hx-api-heading h3 code {
        font-size: inherit;
      }
      .hx-api-entry {
        color: var(--docs-muted);
        font-size: var(--docs-text-xs);
        overflow-wrap: anywhere;
      }
      .hx-api-description,
      .hx-api-usage {
        margin-bottom: var(--docs-space-3);
      }
      .hx-api-usage strong {
        display: block;
        font-size: var(--docs-ui-size);
        margin-bottom: var(--docs-space-1);
      }
      .hx-api-description > :first-child,
      .hx-api-content > :first-child {
        margin-top: 0;
      }
      .hx-api-description > :last-child,
      .hx-api-content > :last-child {
        margin-bottom: 0;
      }
      .hx-api-links {
        display: flex;
        flex-wrap: wrap;
        gap: var(--docs-space-4);
        margin-top: var(--docs-space-2);
        font-size: var(--docs-ui-size);
      }
      .hx-api-links a {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
      }
    }
  }
`;

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
    <article class={html`${apiReferenceStyles}hx-api-reference`} id={id} aria-label={name}>
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
