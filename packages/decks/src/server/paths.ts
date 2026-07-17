/** All public URLs for one deck. */
export interface DeckPaths {
  viewer: string;
  render: string;
  print: string;
  presentation: string;
  presenter: string;
  embed: string;
  exportPdf: string;
  exportPng: string;
  ogImage: string;
  assets: string;
}

/** Creates the canonical route map used by routers, controls, and app code. */
export function createDeckPaths(mountPath: string, slug: string): DeckPaths {
  const mount = normalizeMountPath(mountPath);
  const viewer = `${mount === "/" ? "" : mount}/${encodeURIComponent(slug)}`;
  return {
    viewer,
    render: `${viewer}/render`,
    print: `${viewer}/print`,
    presentation: `${viewer}/presentation`,
    presenter: `${viewer}/presenter`,
    embed: `${viewer}/embed`,
    exportPdf: `${viewer}/export.pdf`,
    exportPng: `${viewer}/export.png`,
    ogImage: `${viewer}/og.png`,
    assets: `${viewer}/assets`,
  };
}

/** Normalizes a configured mount path to one leading slash and no trailing slash. */
export function normalizeMountPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  let start = 0;
  let end = trimmed.length;
  while (trimmed[start] === "/") start += 1;
  while (end > start && trimmed[end - 1] === "/") end -= 1;
  return `/${trimmed.slice(start, end)}`;
}
