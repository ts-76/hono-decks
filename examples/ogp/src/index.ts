import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();
const robotsPolicy = "noindex, nofollow, noarchive";
const robotsText = "User-agent: *\nDisallow: /\n";

app.use("*", async (c, next) => {
  await next();
  c.header("X-Robots-Tag", robotsPolicy);
});
app.get("/robots.txt", (c) => c.text(robotsText));
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());

export default app;
