import { voidDependencies } from "./void";

/** Initialization policies belong to the host integration, not the compiler. */
export const vitePresets: Record<
  "void" | "hono" | "honox",
  {
    dependencies: string[];
    clientEntryAssetPath?: string;
  }
> = {
  void: { dependencies: [...voidDependencies.map(([id]) => id!), "void-plugin-hono-jsx/markdown/compiler"] },
  // @hono/vite-dev-server excludes .js by default. An extensionless application
  // route preserves auth/middleware without patching the app's Vite options.
  hono: { dependencies: ["vite", "hono"], clientEntryAssetPath: "/_assets/client" },
  honox: { dependencies: ["vite", "hono", "honox"], clientEntryAssetPath: "/_assets/client" },
};
