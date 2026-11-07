import { voidDependencies } from "./void";

/** Initialization policies belong to the host integration, not the compiler. */
export const vitePresets: Record<"void" | "hono" | "honox", { dependencies: string[] }> = {
  void: { dependencies: [...voidDependencies.map(([id]) => id!), "void-plugin-hono-jsx/markdown/compiler"] },
  hono: { dependencies: ["vite", "hono"] },
  honox: { dependencies: ["vite", "hono", "honox"] },
};
