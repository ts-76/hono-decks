/// <reference types="vite/client" />
import type { Env } from "hono";
import type { ServerOptions } from "honox/server";
import { withHonoXDecks as connectHonoXDecks } from "hono-decks/honox";
import { decks } from "./decks";
import deckRouter from "./deck-router";

// Same route discovery convention as HonoX. Keep this outside app/routes to
// avoid importing the integration itself through the route glob.
const fileRoutes = import.meta.glob(
  [
    "/app/routes/**/*.{ts,tsx,md,mdx}",
    "/app/routes/.well-known/**/*.{ts,tsx,md,mdx}",
    "!/app/routes/**/_*.{ts,tsx,md,mdx}",
    "!/app/routes/**/-*.{ts,tsx,md,mdx}",
    "!/app/routes/**/$*.{ts,tsx,md,mdx}",
    "!/app/routes/**/*.test.{ts,tsx}",
    "!/app/routes/**/*.spec.{ts,tsx}",
    "!/app/routes/**/-*/**/*",
  ],
  { eager: true },
) as NonNullable<ServerOptions["ROUTES"]>;

export function withHonoXDecks<E extends Env>(options: ServerOptions<E> = {}): ServerOptions<E> {
  return connectHonoXDecks(options, { routes: fileRoutes, mountPath: decks.mountPath, router: deckRouter });
}
