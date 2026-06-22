export interface GeneratedClientEntryUrlOptions {
  clientEntryAsset?: string;
  clientEntryAssetPath?: string;
}

export function extractAssetPath(path: string, slug: string): string {
  const marker = `/${slug}/assets/`;
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) return "";
  return path.slice(markerIndex + marker.length);
}

export function stripPathSuffix(path: string, suffix: string): string {
  return path.endsWith(suffix) ? path.slice(0, -suffix.length) : path;
}

export function inferMountPath(path: string, slug: string): string {
  const marker = `/${slug}`;
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) return "";
  return path.slice(0, markerIndex) || "/";
}

export function resolveGeneratedClientEntryUrl(
  options: GeneratedClientEntryUrlOptions,
  mountPath: string,
): string | undefined {
  if (!options.clientEntryAsset) return undefined;
  const basePath = mountPath === "/" ? "" : mountPath.replace(/\/$/, "");
  return `${basePath}${normalizeClientEntryAssetPath(options.clientEntryAssetPath)}`;
}

export function normalizeClientEntryAssetPath(path = "/_assets/client.js"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/{2,}/g, "/");
}
