import { createApp } from "honox/server";

const robotsPolicy = "noindex, nofollow, noarchive";
const robotsText = "User-agent: *\nDisallow: /\n";

export default createApp({
  init(app) {
    app.use("*", async (c, next) => {
      await next();
      c.header("X-Robots-Tag", robotsPolicy);
    });
    app.get("/robots.txt", (c) => c.text(robotsText));
  },
});
