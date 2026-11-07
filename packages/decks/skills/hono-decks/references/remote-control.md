# Cross-device presentation control

## Cross-device presentation control

Cloudflare Workers can opt into live rooms with `hono-decks/remote`. Export `DeckRemoteRoom` from the Worker, bind it as a Durable Object, and configure `remote.namespace` and `remote.authorize`. The default room name is the deck slug; `session` can select another stable room, and `follow: false` starts viewers with follow paused. The presenter page and `/:slug/remote` control the presentation; authorized viewers receive position updates and can stop or resume following. Keep a presenter page open to process Next and Previous commands.

Authorization is required on every WebSocket connection. Presenter access grants control; follower access grants live position only. The remote page includes speaker notes and requires presenter authorization; the socket carries only positions and commands. Messages are validated, capped at 1 KB, and rate-limited per socket. The socket route rejects cross-origin browser requests. Protect the presenter and other routes that expose notes separately; remote authorization does not protect the whole deck. Use HTTPS, secure session cookies, and `Cache-Control: no-store` for authenticated content. Include `wss:` or `ws:` as appropriate in CSP `connect-src` (same-origin WebSockets can be covered by `'self'`, depending on browser support). See the remote recipe for the binding, migration, and authorization example.

See the [remote control recipe](https://github.com/ts-76/hono-decks/blob/main/docs/app/content/docs/recipes.mdx#remote-control) for a binding, migration, and secure cookie authorization pattern.
