import { Hono } from "hono";
import type { ServerOptions } from "honox/server";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import { withHonoXDecks } from "../src/honox";

describe("shared HonoX integration", () => {
  it("preserves typed options, explicit route selection and middleware without mutation", () => {
    type AppEnv = { Bindings: { TOKEN: string } };
    const options: ServerOptions<AppEnv> = {
      ROUTES: { "/app/routes/api.ts": { default: () => new Response("api") } },
      init(app) {
        app.use(async (c, next) => {
          c.header("X-Token", c.env.TOKEN);
          await next();
        });
      },
      MIDDLEWARE: {},
      trailingSlash: true,
    };
    const router = new Hono();
    const result = withHonoXDecks(options, {
      routes: { "/app/routes/[...ignored].tsx": { default: () => new Response("ignored") } },
      mountPath: "/talks/archive/",
      router,
    });
    expectTypeOf(result).toExtend<ServerOptions<AppEnv>>();
    expect(result.init).toBe(options.init);
    expect(result.MIDDLEWARE).toBe(options.MIDDLEWARE);
    expect(result.trailingSlash).toBe(true);
    expect(result.ROUTES["/app/routes/talks/archive/index.ts"]).toEqual({ default: router });
    expect(Object.keys(options.ROUTES!)).toEqual(["/app/routes/api.ts"]);
    expect(Object.keys(result.ROUTES)).toHaveLength(2);
  });

  it("detects grouped, dynamic, static, root, and nested app conflicts", () => {
    const router = new Hono();
    for (const file of [
      "slides.tsx",
      "slides/child.tsx",
      "(public)/slides/index.tsx",
      "[...path].tsx",
      "[slug].tsx",
      "[slug]/child.tsx",
    ]) {
      expect(() =>
        withHonoXDecks({}, { routes: { ["/app/routes/" + file]: {} }, mountPath: "/slides", router }),
      ).toThrow("conflicts");
    }
    expect(() =>
      withHonoXDecks({}, { routes: { "/app/routes/index.ts": { default: router } }, mountPath: "/slides", router }),
    ).toThrow("conflicts");
    expect(() => withHonoXDecks({}, { routes: { "/app/routes/api.ts": {} }, mountPath: "/", router })).toThrow(
      "conflicts",
    );
    expect(() =>
      withHonoXDecks({}, { routes: { "/app/routes/slides.ts": {} }, mountPath: "/slides/archive", router }),
    ).not.toThrow();
    expect(() =>
      withHonoXDecks(
        {},
        { routes: { "/app/routes/slides.ts": { default: router } }, mountPath: "/slides/archive", router },
      ),
    ).toThrow("conflicts");
    expect(() => withHonoXDecks({ root: "/custom" }, { routes: {}, mountPath: "/slides", router })).toThrow(
      "custom HonoX roots",
    );
  });
});
