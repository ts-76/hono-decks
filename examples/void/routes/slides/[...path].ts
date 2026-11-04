import { defineHandler } from "void";
import { deckApp } from "../../lib/decks";

export const GET = defineHandler((c) => deckApp.fetch(c.req.raw, c.env, c.executionCtx));
