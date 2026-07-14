import type {} from "hono";

declare module "hono" {
  interface Env {
    Variables: {};
    Bindings: {};
  }

  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: { title?: string; description?: string; activePath?: string },
    ): Response | Promise<Response>;
  }
}
