import { Hono } from "hono";

const app = new Hono();
app.use("*", async (c, next) => {
  if (c.req.query("deny") === "1") return c.text("Denied by existing app", 401);
  await next();
  c.header("X-App-Middleware", "preserved");
});
app.get("/", (c) => c.html("<h1>Existing Hono home</h1>"));
app.get("/api/health", (c) => c.json({ existing: true }));
app.notFound((c) => c.text("Existing Hono 404", 404));

export default app;
