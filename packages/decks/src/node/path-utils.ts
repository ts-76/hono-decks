import { relative } from "node:path";

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  return normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : ".";
}

export function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

export function normalizeDeckRoot(root: string): string {
  const normalized = normalizeRelativePath(root, "Deck root").replace(/\/$/, "");

  if (normalized === ".") {
    throw new Error("Deck root must be a relative path inside the current working directory");
  }

  return normalized;
}

export function normalizeRelativePath(path: string, label: string): string {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const segments = normalized.split("/");

  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.includes("..")
  ) {
    throw new Error(`${label} must be a relative path inside the current working directory`);
  }

  return normalized;
}

export function toImportPath(fromFile: string, targetFile: string): string {
  const fromDir = dirname(normalizePath(fromFile));
  const target = stripScriptExtension(normalizePath(targetFile));
  const relativePath = normalizePath(relative(fromDir, target));
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

export function stripScriptExtension(path: string): string {
  return path.replace(/\/index\.(tsx|ts|jsx|js)$/, "").replace(/\.(tsx|ts|jsx|js)$/, "");
}
