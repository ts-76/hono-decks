import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();

app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());

export default app;
