import { Hono } from "hono";
import { createDecksRouter } from "./decks";

const app = new Hono();

app.get("/", (c) => c.redirect("/decks/welcome"));
app.route("/decks", createDecksRouter());

export default app;
