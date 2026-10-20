import { createApp } from "honox/server";
export default createApp({
  init(app) { app.get("/api/health", (c) => c.json({ existing: true })); },
});
