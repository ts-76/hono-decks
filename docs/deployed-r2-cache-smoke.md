# Deployed R2 Cache Smoke

The basic example already tests R2-backed assets locally, but deployed cache behavior needs a real Cloudflare Worker URL. This smoke check verifies that a generated deck asset is served through the R2 binding and carries the long-lived cache header expected by `withR2Assets()`.

## What It Checks

The smoke command requests:

```text
/decks/media/assets/r2-remote.svg
```

It requires:

- HTTP `200`
- `content-type` includes `image/svg+xml`
- `cache-control: public, max-age=31536000, immutable`
- `x-hono-decks-asset-source: r2`

It also reports `cf-cache-status` and `age` when Cloudflare sends them. Those headers are observational in this script because the route is served by the Worker asset boundary; Cloudflare edge cache policy can vary by route, cache rules, and deployment setup.

## Setup

Bind an R2 bucket to the sample Worker as `DECK_ASSETS`. The bucket should contain the generated asset source path as its object key:

```text
decks/media/assets/r2-remote.svg
```

For example, from `examples/basic`:

```bash
wrangler r2 object put <bucket-name>/decks/media/assets/r2-remote.svg --file decks/media/assets/r2-remote.svg --content-type image/svg+xml
```

The sample Worker can be deployed under a `tslab.app` subdomain, for example:

```text
https://hono-decks-basic.tslab.app
```

## Run

```bash
HONO_DECKS_DEPLOYED_ORIGIN=https://hono-decks-basic.tslab.app bun run --cwd examples/basic smoke:r2-cache
```

or:

```bash
bun run --cwd examples/basic smoke:r2-cache -- --origin https://hono-decks-basic.tslab.app
```

Use `--asset` to check a different generated asset path:

```bash
bun run --cwd examples/basic smoke:r2-cache -- --origin https://hono-decks-basic.tslab.app --asset /decks/sample/assets/r2-cache.svg
```

## Interpreting Failures

- `x-hono-decks-asset-source: embedded` means the Worker could not read the object from R2 and fell back to the generated embedded asset.
- Missing or short `cache-control` means the response did not come through the R2-backed path configured by the sample `DeckSource`.
- Missing `cf-cache-status` or `age` does not fail the smoke by itself. If those must be guaranteed, add a Cloudflare Cache Rule or Cache API layer for the deployed route and extend this smoke check accordingly.
