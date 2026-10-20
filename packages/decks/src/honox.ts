import type { Hono } from "hono";
import { normalizeMountPath } from "./server/paths";

/** Keep route discovery in the host's Vite graph; route composition lives here. */
export interface HonoXDecksIntegration<R extends object> {
  routes: Record<string, R>;
  mountPath: string;
  router: Hono<any>;
}

/** Preserve HonoX options and mount decks through its normal routing pipeline.
 * Uses structural types so Hono-only consumers do not need to install HonoX.
 */
export function withHonoXDecks<T extends { root?: string; ROUTES?: Record<string, object> }, R extends object>(
  options: T,
  input: HonoXDecksIntegration<R>,
): T & { ROUTES: Record<string, R | NonNullable<T["ROUTES"]>[string] | { default: Hono<any> }> } {
  const root = options.root ?? "/app/routes";
  if (root !== "/app/routes") throw new Error("hono-decks: custom HonoX roots require a custom route integration.");
  const routes = (options.ROUTES ?? input.routes) as Record<string, R | NonNullable<T["ROUTES"]>[string]>;
  const mountPath = normalizeMountPath(input.mountPath);
  const mount = mountPath === "/" ? "" : mountPath;
  for (const [file, route] of Object.entries(routes)) {
    const path = file
      .slice(root.length)
      .replace(/\.[^.]+$/, "")
      .replace(/\([^/]+\)/g, "")
      .replace(/\/index$/, "")
      .replace(/\/+/g, "/");
    const value = (route as { default?: unknown }).default;
    const isApp = Boolean(value && typeof value === "object" && "fetch" in value);
    if (routesOverlap(path, mount, isApp)) {
      throw new Error(`hono-decks: mountPath ${mountPath} conflicts with HonoX route ${file}`);
    }
  }
  return {
    ...options,
    ROUTES: { ...routes, [root + mount + "/index.ts"]: { default: input.router } },
  };
}

function routesOverlap(path: string, mount: string, isApp: boolean): boolean {
  const route = path.split("/").filter(Boolean);
  const target = mount.split("/").filter(Boolean);
  for (let index = 0; index < Math.min(route.length, target.length); index++) {
    const part = route[index]!;
    if (part.startsWith("[...")) return true;
    if (!/^\[[^\]]+\]$/.test(part) && part !== target[index]) return false;
  }
  return route.length >= target.length || isApp || route.some((part) => part.startsWith("[..."));
}
