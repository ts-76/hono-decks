import { createRoute } from "honox/factory";
import { CodeBlock, RouteTable } from "../site";

const installCode = `bun add @hono/decks
bunx hono-decks init --out src/decks.ts
bunx hono-decks compile --root decks --out src/generated --mount /decks`;

const routeCode = `import { Hono } from "hono"
import { createDecksRouter } from "./decks"

const app = new Hono()
app.route("/decks", createDecksRouter())

export default app`;

export default createRoute((c) =>
  c.render(
    <main class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-signal">
            <span aria-hidden="true"></span> Hono route kit for MDX slides
          </p>
          <h1 id="hero-title">
            Slides belong in
            <br />
            <em>your Hono app.</em>
          </h1>
          <p class="hero-lede">
            MDX を build-time に Hono JSX module へ。viewer、presentation、presenter、export を、既存の Hono app
            に普通の route として組み込みます。
          </p>
          <div class="hero-actions">
            <a class="button button-primary" href="/docs/getting-started">
              5分で始める <span aria-hidden="true">→</span>
            </a>
            <a class="button button-secondary" href="/api">
              API を見る
            </a>
          </div>
          <dl class="hero-facts">
            <div>
              <dt>Runtime</dt>
              <dd>Hono + Web Standards</dd>
            </div>
            <div>
              <dt>Authoring</dt>
              <dd>MDX + local components</dd>
            </div>
          </dl>
        </div>
        <div class="hero-artifact" aria-label="Example Hono deck integration">
          <div class="artifact-tabbar" aria-hidden="true">
            <span class="artifact-dot"></span>
            <span>src/index.ts</span>
            <span class="artifact-status">route mounted</span>
          </div>
          <CodeBlock code={routeCode} label="Hono" />
          <div class="route-stack" aria-label="Generated deck routes">
            <div>
              <code>GET /decks</code>
              <span>index</span>
            </div>
            <div>
              <code>GET /decks/:slug</code>
              <span>viewer</span>
            </div>
            <div>
              <code>GET /decks/:slug/presenter</code>
              <span>presenter</span>
            </div>
          </div>
        </div>
      </section>

      <section class="boundary-section" aria-labelledby="boundary-title">
        <div class="section-intro">
          <h2 id="boundary-title">A route kit, not another runtime.</h2>
          <p>
            Node.js は local file I/O と compile だけ。Worker へ届くのは generated module と Hono route です。
          </p>
        </div>
        <div class="boundary-flow" aria-label="Build and runtime boundaries">
          <div>
            <span>01</span>
            <strong>Author</strong>
            <code>decks/*/deck.mdx</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>02</span>
            <strong>Compile</strong>
            <code>hono-decks compile</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>03</span>
            <strong>Route</strong>
            <code>app.route("/decks", …)</code>
          </div>
        </div>
      </section>

      <section class="quickstart-section" aria-labelledby="quickstart-title">
        <div>
          <p class="section-note">One install. One generated entry. Your app stays in control.</p>
          <h2 id="quickstart-title">Start from a clean boundary.</h2>
          <p>
            compiler dependencies は <code>@hono/decks/node</code> に閉じ、標準 entry は Worker-safe な runtime API
            だけを公開します。
          </p>
          <a class="text-link" href="/docs/getting-started">
            setup guide を読む <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={installCode} label="Terminal" />
      </section>

      <section class="surfaces-section" aria-labelledby="surfaces-title">
        <div class="section-intro compact">
          <h2 id="surfaces-title">Every surface is a route.</h2>
          <p>既定 UI を使い、必要な surface だけ request-aware に上書きできます。</p>
        </div>
        <RouteTable
          rows={[
            ["/:slug", "iframe viewer と navigation controls"],
            ["/:slug/render", "隔離された slide runtime"],
            ["/:slug/presentation", "projection 専用 surface"],
            ["/:slug/presenter", "next preview と speaker notes"],
            ["/:slug/print", "browser print / PDF source"],
          ]}
        />
      </section>
    </main>,
    {
      activePath: "/",
      description: "MDX slide routes を既存の Hono application に組み込む @hono/decks documentation",
    },
  ),
);
