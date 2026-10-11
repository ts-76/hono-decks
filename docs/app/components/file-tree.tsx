/** @jsxImportSource hono/jsx */
import type { PropsWithChildren } from "hono/jsx";

function FileIcon({ folder = false }: { folder?: boolean }) {
  return (
    <svg class="hx-file-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {folder ? (
        <path
          d="M2 4a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z"
          stroke="currentColor"
          stroke-linejoin="round"
        />
      ) : (
        <path d="M4 2h5l3 3v9H4V2Zm5 0v4h3" stroke="currentColor" stroke-linejoin="round" />
      )}
    </svg>
  );
}

/** Nested lists and native disclosures remain usable without JavaScript. */
export function FileTree({ label = "Project files", children }: PropsWithChildren<{ label?: string }>) {
  return (
    <div class="hx-file-tree" role="group" aria-label={label}>
      <ul class="hx-file-list">{children}</ul>
    </div>
  );
}

export function Folder({ name, open = true, children }: PropsWithChildren<{ name: string; open?: boolean }>) {
  return (
    <li class="hx-file-item">
      <details class="hx-folder" open={open}>
        <summary class="hx-folder-summary">
          <svg class="hx-folder-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="m4 2 4 4-4 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <FileIcon folder />
          <span>{name}</span>
        </summary>
        <ul class="hx-file-list">{children}</ul>
      </details>
    </li>
  );
}

/** highlighted marks a file of interest, without implying navigation selection. */
export function File({ name, href, highlighted = false }: { name: string; href?: string; highlighted?: boolean }) {
  const content = (
    <>
      <FileIcon />
      <span>{name}</span>
    </>
  );
  return (
    <li class="hx-file-item">
      {href ? (
        <a class={`hx-file-row${highlighted ? " hx-file-highlighted" : ""}`} href={href}>
          {content}
        </a>
      ) : (
        <span class={`hx-file-row${highlighted ? " hx-file-highlighted" : ""}`}>{content}</span>
      )}
    </li>
  );
}
