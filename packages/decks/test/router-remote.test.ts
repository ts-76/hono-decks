import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter, type DeckRemoteOptions } from "../src/server/router";
import { deck } from "./support/router-fixtures";

function app(remote?: DeckRemoteOptions) {
  const result = new Hono();
  result.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), remote }));
  return result;
}

describe("remote socket route", () => {
  it("is absent when disabled or the namespace is unavailable", async () => {
    expect((await app().request("/slides/deck1/remote/socket")).status).toBe(404);
    expect(
      (await app({ namespace: () => undefined, authorize: () => true }).request("/slides/deck1/remote/socket")).status,
    ).toBe(404);
  });
  it("requires upgrade, authorization and a same-origin request before forwarding trusted headers", async () => {
    let forwarded: Request | undefined;
    let room = "";
    const namespace = {
      idFromName: (name: string) => {
        room = name;
        return name;
      },
      get: () => ({
        fetch: (request: Request) => {
          forwarded = request;
          return new Response("connected");
        },
      }),
    } as unknown as DurableObjectNamespace;
    const remote: DeckRemoteOptions = {
      namespace: () => namespace,
      authorize: ({ role }) => role === "follower",
      session: ({ slug }) => `room:${slug}`,
    };
    const server = app(remote);
    expect((await server.request("/slides/deck1/remote/socket?role=follower")).status).toBe(426);
    expect(
      (await server.request("/slides/deck1/remote/socket?role=presenter", { headers: { Upgrade: "websocket" } }))
        .status,
    ).toBe(403);
    expect(
      (
        await server.request("/slides/deck1/remote/socket?role=follower", {
          headers: { Upgrade: "websocket", Origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    const response = await server.request("/slides/deck1/remote/socket?role=follower", {
      headers: { Upgrade: "websocket", "X-Hono-Decks-Role": "presenter", "X-Hono-Decks-Slide-Count": "999" },
    });
    expect(response.status).toBe(200);
    expect(room).toBe("room:deck1");
    expect(forwarded?.headers.get("X-Hono-Decks-Role")).toBe("follower");
    expect(forwarded?.headers.get("X-Hono-Decks-Slide-Count")).toBe(String(deck.slides.length));
  });
  it("renders remote clients only for authorized roles and keeps notes off the viewer", async () => {
    const namespace = {} as DurableObjectNamespace;
    const source = manifestDeckSource({
      decks: [{ ...deck, slides: [{ ...deck.slides[0]!, notes: "PRIVATE NOTE" }] }],
    });
    const server = new Hono();
    server.route(
      "/slides",
      decksRouter({
        source,
        document: { nonce: "test-nonce" },
        remote: { namespace: () => namespace, authorize: ({ role }) => role === "presenter" },
      }),
    );
    const viewer = await (await server.request("/slides/deck1")).text();
    expect(viewer).not.toContain("data-hono-decks-remote-runtime");
    expect(viewer).not.toContain("PRIVATE NOTE");
    expect(await (await server.request("/slides/deck1/render")).text()).not.toContain("PRIVATE NOTE");
    const presenter = await (await server.request("/slides/deck1/presenter")).text();
    expect(presenter).toContain('data-hono-decks-remote-runtime nonce="test-nonce"');
    expect(presenter).toContain('popovertarget="hono-decks-remote-qr"');
    expect(presenter).toContain('href="http://localhost/slides/deck1/remote"');
    expect(presenter).not.toContain("hono-decks-presenter-remote-link");
    const followerServer = app({ namespace: () => namespace, authorize: () => true });
    expect(await (await followerServer.request("/slides/deck1")).text()).toContain("data-hono-decks-remote-runtime");
    const remote = await (await server.request("/slides/deck1/remote")).text();
    expect(remote).toContain("PRIVATE NOTE");
    expect(remote).toContain('data-hono-decks-remote-runtime nonce="test-nonce"');
    expect((await app().request("/slides/deck1/remote")).status).toBe(404);
    expect(
      (await app({ namespace: () => namespace, authorize: () => false }).request("/slides/deck1/remote")).status,
    ).toBe(403);
  });

  it("shows a QR code for the remote page on the presenter page, rewritable by the app", async () => {
    const namespace = {} as DurableObjectNamespace;
    const presenter = await (
      await app({ namespace: () => namespace, authorize: () => true }).request(
        "https://talk.example/slides/deck1/presenter?lang=ja&slide=2&step=1",
      )
    ).text();
    expect(presenter).toContain('popovertarget="hono-decks-remote-qr"');
    expect(presenter).toContain('<div id="hono-decks-remote-qr" class="hono-decks-remote-qr" popover><svg role="img"');
    expect(presenter).toContain('href="https://talk.example/slides/deck1/remote?lang=ja"');
    expect(presenter).not.toMatch(/<[^>]+ style="/);
    const rewritten = await (
      await app({
        namespace: () => namespace,
        authorize: () => true,
        url: ({ url, slug }) => `${url.replace("talk.example", "192.168.0.10:8787")}&room=${slug}`,
      }).request("https://talk.example/slides/deck1/presenter")
    ).text();
    expect(rewritten).toContain('href="https://192.168.0.10:8787/slides/deck1/remote&amp;room=deck1"');
    const follower = await (
      await app({ namespace: () => namespace, authorize: ({ role }) => role === "follower" }).request(
        "/slides/deck1/presenter",
      )
    ).text();
    expect(follower).not.toContain("hono-decks-remote-qr");
  });

  it("renders a phone-first remote with notes, a slide list, and the talk duration", async () => {
    const namespace = {} as DurableObjectNamespace;
    const server = new Hono();
    server.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [{ ...deck, slides: [{ ...deck.slides[0]!, notes: "Say hello" }] }] }),
        presenter: { duration: "10m" },
        document: { nonce: "n1" },
        remote: { namespace: () => namespace, authorize: () => true },
      }),
    );
    const html = await (await server.request("/slides/deck1/remote")).text();
    expect(html).toContain('class="hono-decks-remote-notes"');
    expect(html).toContain("Say hello");
    expect(html).not.toContain("<details>");
    expect(html).toContain('data-remote-goto="0" aria-current="true"');
    expect(html).toContain("data-remote-remaining");
    expect(html).toContain("let duration = 600");
    expect(html).toContain("navigator.wakeLock");
    expect(html).not.toMatch(/<[^>]+ style="/);
    for (const tag of html.match(/<(?:style|script)\b[^>]*>/gi) ?? []) expect(tag).toContain('nonce="n1"');
  });
});
