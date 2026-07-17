import type {} from "hono";
import type { LanguageVariables } from "hono/language";

declare module "hono" {
  interface Env {
    Variables: LanguageVariables;
    Bindings: {};
  }
}
