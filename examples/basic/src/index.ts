import { Hono } from "hono";
import { decksRouter } from "./generated/decks";

export { decksRouter };

interface Env {}

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.redirect("/decks"));
app.route("/decks", decksRouter());

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
