import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter } from "../src/server/router";
import type { CompiledDeck } from "../src/deck/model";
import { deck } from "./support/router-fixtures";

describe("decksRouter presenter and presentation surfaces", () => {
  it("keeps presenter pagination in query parameters", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1/presenter?slide=2&step=1&ignored=yes");
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain('href="/slides/deck1?slide=2&amp;step=1"');
    expect(html).toContain('src="/slides/deck1/presentation?slide=2&amp;step=1"');
    expect(html).toContain('data-projection-url="/slides/deck1/presentation?slide=2&amp;step=1"');
    expect(html).toContain("writePresenterPaginationState()");
    expect(html).toContain('url.searchParams.set("slide", String(currentIndex + 1))');
    expect(html).not.toContain("ignored=yes");
  });

  it("serves a clean projection route and a presenter route with next preview and speaker notes", async () => {
    const presentationDeck = {
      ...deck,
      slides: [
        {
          index: 0,
          meta: { title: "Intro", layout: "cover", meta: {} },
          html: "<h1>Intro</h1>",
          notes: "Open with the Worker runtime boundary.",
          components: [],
        },
        {
          index: 1,
          meta: { title: "Next Steps", layout: "default", meta: {} },
          html: "<h2>Next Steps</h2>",
          notes: "Point people to the presenter route.",
          components: [],
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [presentationDeck] }) }));

    const projection = await app.request("/slides/deck1/presentation");
    expect(projection.status).toBe(200);
    const projectionHtml = await projection.text();
    expect(projectionHtml).toContain("data-hono-decks-projection");
    expect(projectionHtml).toContain("<h1>Intro</h1>");
    expect(projectionHtml).toContain("hono-decks:state");
    expect(projectionHtml).toContain("window.opener.postMessage");
    expect(projectionHtml).not.toContain("data-hono-decks-viewer-controls");
    expect(projectionHtml).not.toContain("data-hono-decks-back-link");
    expect(projectionHtml).not.toContain("Open with the Worker runtime boundary.");

    const presenter = await app.request("/slides/deck1/presenter");
    expect(presenter.status).toBe(200);
    const presenterHtml = await presenter.text();
    expect(presenterHtml).toContain("data-hono-decks-presenter");
    expect(presenterHtml).toContain("data-hono-decks-presenter-current");
    expect(presenterHtml).toContain('src="/slides/deck1/presentation"');
    expect(presenterHtml).toContain("data-hono-decks-presenter-next");
    expect(presenterHtml).toContain("<h2>Next Steps</h2>");
    expect(presenterHtml).toContain(
      ".hono-decks-presenter-preview{position:relative;aspect-ratio:16/9;overflow:hidden;",
    );
    expect(presenterHtml).toContain(
      "body:not([data-overview-mode]) .hono-decks-presenter-preview .slide{position:absolute;inset:0 auto auto 0;width:var(--hono-decks-width);height:var(--hono-decks-height);",
    );
    expect(presenterHtml).toContain("function fitPresenterPreview(preview)");
    expect(presenterHtml).toMatch(
      /data-hono-decks-presenter-preview data-slide-index="1"[^>]*><section[^>]*data-slide-state="active"/,
    );
    expect(presenterHtml).toContain("data-hono-decks-presenter-notes");
    expect(presenterHtml).toContain("Open with the Worker runtime boundary.");
    expect(presenterHtml).toContain("Point people to the presenter route.");
    expect(presenterHtml).not.toContain("data-hono-decks-viewer-controls");
  });

  it("gates the presenter route and viewer control link from router options", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        presenter: {
          enabled: ({ c, dev, presenterPath, presentationPath }) => {
            expect(dev).toBe(false);
            expect(presenterPath).toBe("/slides/deck1/presenter");
            expect(presentationPath).toBe("/slides/deck1/presentation");
            return c.req.header("x-presenter-enabled") === "1";
          },
          viewerControl: {
            label: "Present",
            attributes: { "data-presenter-control": "enabled" },
          },
        },
      }),
    );

    const disabledPresenter = await app.request("/slides/deck1/presenter");
    expect(disabledPresenter.status).toBe(404);

    const disabledViewerHtml = await (await app.request("/slides/deck1")).text();
    expect(disabledViewerHtml).not.toContain('href="/slides/deck1/presenter"');
    expect(disabledViewerHtml).not.toContain('data-presenter-control="enabled"');

    const enabledPresenter = await app.request("/slides/deck1/presenter", {
      headers: { "x-presenter-enabled": "1" },
    });
    expect(enabledPresenter.status).toBe(200);

    const enabledViewerHtml = await (
      await app.request("/slides/deck1", {
        headers: { "x-presenter-enabled": "1" },
      })
    ).text();
    expect(enabledViewerHtml).toContain('href="/slides/deck1/presenter"');
    expect(enabledViewerHtml).toContain('data-presenter-control="enabled"');
    expect(enabledViewerHtml).toContain('aria-label="Present"');
    expect(enabledViewerHtml).toContain("data-hono-decks-control-icon");
    expect(enabledViewerHtml).not.toContain(">Present</a>");
  });

  it("does not resolve presenter viewer control when viewer controls are disabled", async () => {
    const app = new Hono();
    let calls = 0;
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: { controls: false },
        presenter: {
          enabled: () => {
            calls += 1;
            return true;
          },
          viewerControl: true,
        },
      }),
    );

    const response = await app.request("/slides/deck1");

    expect(response.status).toBe(200);
    expect(calls).toBe(0);
  });

  it("renders presenter controls and guards state messages to the projection frame", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const presenter = await app.request("/slides/deck1/presenter");
    const presenterHtml = await presenter.text();

    expect(presenter.status).toBe(200);
    expect(presenterHtml).toContain("data-hono-decks-presenter-controls");
    expect(presenterHtml).toContain('href="/slides"');
    expect(presenterHtml).toContain('href="/slides/deck1"');
    expect(presenterHtml).toContain('data-action="openProjection"');
    expect(presenterHtml).toContain('data-projection-url="/slides/deck1/presentation"');
    expect(presenterHtml).toContain("window.open(url.href");
    expect(presenterHtml).toContain("projectionWindow?.postMessage");
    expect(presenterHtml).toContain("function syncProjectionState(source, index, stepIndex)");
    expect(presenterHtml).toContain("if (event.source !== frame?.contentWindow) projectionWindow = event.source");
    expect(presenterHtml).toContain('action: "goTo", index, stepIndex');
    expect(presenterHtml).toContain("width=1920,height=1080");
    expect(presenterHtml).toContain("data-hono-decks-control-icon");
    expect(presenterHtml).toContain("pointer-events:none");
    expect(presenterHtml).not.toContain("hono-decks-presenter-control-text");
    expect(presenterHtml).toContain('d="M3 11l9-8 9 8"');
    expect(presenterHtml).toContain('d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"');
    expect(presenterHtml).toContain('aria-label="Deck list"');
    expect(presenterHtml).toContain('aria-label="Viewer"');
    expect(presenterHtml).toContain('aria-label="Projection"');
    expect(presenterHtml).toContain('data-action="previous"');
    expect(presenterHtml).toContain('data-action="next"');
    expect(presenterHtml).toContain("data-hono-decks-presenter-position");
    expect(presenterHtml).not.toContain("data-hono-decks-presenter-clock");
    expect(presenterHtml).not.toContain("updateClock");
    expect(presenterHtml).not.toContain("setInterval");
    expect(presenterHtml).toContain("data-hono-decks-presenter-connection");
    expect(presenterHtml).toContain("syncProjectionState(event.source, message.index, stepIndex)");
    expect(presenterHtml).toContain("event.origin !== window.location.origin");
  });

  it("keeps the presenter next preview height when there is no next slide", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const presenter = await app.request("/slides/deck1/presenter");
    expect(presenter.status).toBe(200);
    const presenterHtml = await presenter.text();
    expect(presenterHtml).toContain(
      ".hono-decks-presenter-no-next:not([hidden]){display:grid;place-items:center;aspect-ratio:16/9;",
    );
    expect(presenterHtml).toContain(
      '<p class="hono-decks-presenter-no-next" data-hono-decks-presenter-no-next>No next slide</p>',
    );
  });
});
