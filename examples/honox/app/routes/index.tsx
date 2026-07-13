import { createRoute } from "honox/factory";

export default createRoute((c) =>
  c.render(
    <main class="page">
      <section class="page-card">
        <p class="page-kicker">HonoX file-based routing</p>
        <h1>HonoX + @hono/decks</h1>
        <p>
          HonoXの通常ページと、build時に生成したdeck routerを同じアプリへmountする例です。
        </p>
        <nav class="page-actions" aria-label="Deck links">
          <a href="/decks">Deck index</a>
          <a href="/decks/honox">Open deck</a>
        </nav>
      </section>
    </main>,
  ),
);
