/** @jsxImportSource hono/jsx */
// Literal browser source keeps build-time function-name helpers out of the inline
// script. This must run independently of the module graph before CSS is loaded.
const themeInitializer = String.raw`(() => {
  const key = "honoxpress-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const valid = (value) =>
    value === "light" || value === "dark" || value === "system";
  let choice = "system";
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) choice = saved;
  } catch {
    // Private or restricted storage still permits an in-page preference.
  }
  const apply = () => {
    document.documentElement.dataset.theme =
      choice === "system" ? (media.matches ? "dark" : "light") : choice;
    document.querySelectorAll("[data-hx-theme-switch]").forEach((select) => {
      if (!(select instanceof HTMLSelectElement)) return;
      select.value = choice;
      select.disabled = false;
    });
  };
  apply();
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  document.addEventListener("change", (event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !select.hasAttribute("data-hx-theme-switch"))
      return;
    if (!valid(select.value)) return;
    choice = select.value;
    try {
      localStorage.setItem(key, choice);
    } catch {
      // Keep the current selection even when persistence is unavailable.
    }
    apply();
  });
  media.addEventListener("change", () => {
    if (choice === "system") apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    choice = valid(event.newValue) ? event.newValue : "system";
    apply();
  });
})();`;

/** Render in head, before the stylesheet, to avoid flashing the wrong palette. */
export function ThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitializer }} />;
}

/** Native three-way selection; ThemeScript enables and synchronizes controls. */
export function ThemeSwitch({ locale = "en" }: { locale?: string }) {
  const labels =
    locale === "ja"
      ? { theme: "テーマ", light: "ライト", dark: "ダーク", system: "システム" }
      : { theme: "Theme", light: "Light", dark: "Dark", system: "System" };
  return (
    <label class="hx-theme-switch">
      <span class="sr-only">{labels.theme}</span>
      <select data-hx-theme-switch disabled>
        <option value="light">{labels.light}</option>
        <option value="dark">{labels.dark}</option>
        <option value="system" selected>
          {labels.system}
        </option>
      </select>
      <svg
        class="hx-theme-chevron"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </label>
  );
}
