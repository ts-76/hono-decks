/** @jsxImportSource hono/jsx */
import { useState } from "hono/jsx";

// Copy into app/islands. HonoX detects islands by the consumer-owned file path.
export default function CopyCode({
  code,
  language = "text",
  tokens,
  filename = "Terminal",
  copyLabel = "Copy code",
  copiedLabel = "Copied",
  errorLabel = "Copy failed. Select and copy the code manually.",
}: {
  code: string;
  language?: string;
  tokens?: readonly { content: string; kind: string }[];
  filename?: string;
  copyLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [pending, setPending] = useState(false);
  const highlighted = tokens?.map((token) => token.content).join("") === code ? tokens : undefined;
  const copy = async () => {
    setPending(true);
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  };
  return (
    <figure class="code-block">
      <figcaption class="code-toolbar">
        <span class="code-filename">{filename}</span>
        <button
          type="button"
          aria-label={copyLabel}
          title={status === "copied" ? copiedLabel : status === "error" ? errorLabel : copyLabel}
          disabled={pending}
          onClick={() => void copy()}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {status === "copied" ? (
              <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <>
                <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" />
                <path d="M10 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" stroke="currentColor" />
              </>
            )}
          </svg>
          <span class="code-copy-label">{status === "copied" ? copiedLabel : copyLabel}</span>
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={filename}>
        <code class={`language-${language}`}>
          {highlighted
            ? highlighted.map((token) => <span class={`hx-syntax-${token.kind}`}>{token.content}</span>)
            : code}
        </code>
      </pre>
      <span role="status" aria-live="polite" class={status === "error" ? "copy-error" : "sr-only"}>
        {status === "copied" ? copiedLabel : status === "error" ? errorLabel : ""}
      </span>
    </figure>
  );
}
