import { Hono } from "hono";
import { createDeckViewerEmbed, deckContext, type DeckContextVariables } from "@hono/decks";
import { createMiddleware } from "hono/factory";
import type { DecksConfigEnv } from "./decks.config";
import { createDecksRouter, deckMountPath, deckSource } from "./decks";
import {
  renderDeckDetailsPage,
  renderDeckEmbedPage,
  renderHomePage,
} from "./pages";

interface Env extends DecksConfigEnv {
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();

const allowExternalDeckEmbed = createMiddleware<Env>(async (c, next) => {
  await next();

  c.res.headers.delete("X-Frame-Options");
  c.res.headers.set(
    "Content-Security-Policy",
    withFrameAncestors(
      c.res.headers.get("Content-Security-Policy"),
      c.env?.DECK_EMBED_ALLOWED_ORIGINS,
    ),
  );
});

app.get("/", async (c) => c.html(renderHomePage(await deckSource.listDecks(c))));
app.get(
  `${deckMountPath}/:slug/about`,
  deckContext({ source: deckSource, mountPath: deckMountPath }),
  (c) =>
    c.html(renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
    })),
);
app.get(
  `${deckMountPath}/:slug/embed`,
  allowExternalDeckEmbed,
  deckContext({ source: deckSource, mountPath: deckMountPath }),
  async (c) =>
    c.html(renderDeckEmbedPage({
      meta: c.var.deckMeta,
      viewer: await createDeckViewerEmbed({
        deck: c.var.deck,
        mountPath: deckMountPath,
        className: "sample-external-deck-embed",
        controls: {
          items: (controls) => [
            controls.previous,
            controls.position,
            controls.next,
            controls.fullscreen,
          ],
        },
      }),
    })),
);
app.route(deckMountPath, createDecksRouter());

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

function withFrameAncestors(currentPolicy: string | null, configuredOrigins: string | undefined): string {
  const directives = (currentPolicy ?? "")
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive && !/^frame-ancestors(?:\s|$)/i.test(directive));
  const origins = allowedEmbedOrigins(configuredOrigins);
  directives.push(`frame-ancestors ${origins.join(" ")}`);
  return directives.join("; ");
}

function allowedEmbedOrigins(configuredOrigins: string | undefined): string[] {
  const origins = new Set<string>(["'self'"]);

  for (const value of configuredOrigins?.split(/[\s,]+/) ?? []) {
    if (!value) continue;
    if (value === "*") return ["*"];

    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) {
        origins.add(url.origin);
      }
    } catch {
      // Ignore malformed bindings and keep the route same-origin only.
    }
  }

  return [...origins];
}
