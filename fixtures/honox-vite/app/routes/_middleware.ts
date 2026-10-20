import { createRoute } from "honox/factory";
export default createRoute(async (c, next) => {
  if (c.req.query("deny") === "1") return c.text("Denied by existing app", 401);
  await next();
  c.header("X-App-Middleware", "preserved");
});
