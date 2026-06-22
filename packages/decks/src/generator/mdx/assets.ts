import type { AssetRef } from "../../deck/model";

export interface BuildAssetRefsInput {
  root: string;
  mountPath?: string;
  readBinary?(path: string): Promise<Uint8Array>;
}

export async function buildAssetRefs(
  slug: string,
  assetPaths: string[],
  input: BuildAssetRefsInput,
): Promise<AssetRef[]> {
  return Promise.all(
    assetPaths.map(async (sourcePath) => ({
      sourcePath,
      publicPath: `${normalizeMountPath(input.mountPath ?? `/${input.root}`)}/${encodeURIComponent(slug)}/assets/${assetName(
        sourcePath,
        input.root,
        slug,
      )}`,
      type: "local" as const,
      contentType: contentTypeForPath(sourcePath),
      body: input.readBinary ? ((await input.readBinary(sourcePath)) as BodyInit) : undefined,
    })),
  );
}

export function rewriteAssetUrls(source: string, assets: AssetRef[]): string {
  let result = source;
  for (const asset of assets) {
    const assetPath = localAssetRelativePath(asset.sourcePath);
    result = result.replaceAll(`./assets/${assetPath}`, asset.publicPath);
    result = result.replace(new RegExp(`(?<!/)assets/${escapeRegExp(assetPath)}`, "g"), asset.publicPath);
  }
  return result;
}

export function rewriteRelativeMdxImports(source: string, sourceDir: string, generatedDir: string): string {
  return source.replace(/(from\s+|import\s+)(["'])(\.[^"']+)\2/g, (_match, prefix: string, quote: string, specifier: string) => {
    const target = normalizePath(`${sourceDir}/${specifier}`);
    return `${prefix}${quote}${toRelativeImportPath(generatedDir, target)}${quote}`;
  });
}

export function componentImportPath(outDir: string, sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  const source = sourcePath.replace(/\/index\.(tsx|ts|jsx|js)$/, "");
  return toRelativeImportPath(outDir, source);
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "." : normalized.slice(0, index);
}

function assetName(sourcePath: string, root: string, slug: string): string {
  const normalizedPath = normalizePath(sourcePath);
  const prefix = `${normalizePath(root).replace(/\/$/, "")}/${slug}/assets/`;
  const relative = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : (normalizedPath.split("/").at(-1) ?? normalizedPath);
  return relative.split("/").map(encodeURIComponent).join("/");
}

function localAssetRelativePath(sourcePath: string): string {
  const marker = "/assets/";
  const normalized = normalizePath(sourcePath);
  const markerIndex = normalized.indexOf(marker);
  return markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function toRelativeImportPath(fromDir: string, target: string): string {
  const fromParts = normalizePath(fromDir).split("/").filter(Boolean);
  const targetParts = normalizePath(target).split("/").filter(Boolean);
  while (fromParts.length > 0 && targetParts.length > 0 && fromParts[0] === targetParts[0]) {
    fromParts.shift();
    targetParts.shift();
  }
  const relative = [...fromParts.map(() => ".."), ...targetParts].join("/");
  return relative.startsWith(".") ? relative : `./${relative || "."}`;
}

function contentTypeForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
