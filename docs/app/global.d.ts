import type {} from "hono";
import type { LanguageVariables } from "hono/language";

declare module "hono" {
  interface Env {
    Variables: LanguageVariables;
    Bindings: {};
  }

  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: { title?: string; description?: string; activePath?: string },
    ): Response | Promise<Response>;
  }
}
