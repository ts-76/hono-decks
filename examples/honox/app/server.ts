import { createApp } from "honox/server";

export default createApp({
  init(app) {
    app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));
  },
});
