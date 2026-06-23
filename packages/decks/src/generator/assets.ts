import { contentTypeForPath } from "../deck/assets";
import type { AssetRef } from "../deck/model";

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

export {
  componentImportPath,
  dirname,
  rewriteAssetUrls,
  rewriteRelativeMdxImports,
} from "./mdx/assets";
export {
  addExternalAssetWarnings,
  buildExternalAssetRefs,
  collectFrontmatterAssetCandidates,
  collectMarkdownAssetCandidates,
} from "../deck/assets";

function assetName(sourcePath: string, root: string, slug: string): string {
  const normalizedPath = normalizePath(sourcePath);
  const prefix = `${normalizePath(root).replace(/\/$/, "")}/${slug}/assets/`;
  const relative = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : (normalizedPath.split("/").at(-1) ?? normalizedPath);
  return relative.split("/").map(encodeURIComponent).join("/");
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}
