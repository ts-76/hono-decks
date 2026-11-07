export interface GeneratedClientEntryUrlOptions {
  bundle?: string;
  path?: string;
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
  options: GeneratedClientEntryUrlOptions | undefined,
  mountPath: string,
): string | undefined {
  if (!options?.bundle) return undefined;
  const basePath = mountPath === "/" ? "" : mountPath.replace(/\/$/, "");
  return `${basePath}${normalizeClientEntryAssetPath(options.path)}`;
}

export function isWithinMount(path: string, mountPath: string): boolean {
  if (mountPath === "/") return true;
  return path === mountPath || path.startsWith(`${mountPath}/`);
}

/** Extensionless by default: @hono/vite-dev-server does not route `.js` requests to the app. */
export function normalizeClientEntryAssetPath(path = "/_assets/client"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/{2,}/g, "/");
}
