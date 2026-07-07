# Remaining Work

This file is the single markdown source for known unfinished work. Keep detailed implementation plans out of separate markdown files unless they are actively being executed.

## Beads Issues

These items are tracked in beads and remain open.

| ID | Priority | Title | Remaining work |
| --- | --- | --- | --- |
| hono-slides-uuo | P1 | Verify deployed R2 smoke after custom domain DNS provisioning | After the custom domain resolves, run `bun run --cwd examples/basic smoke:r2-cache -- --origin https://hono-decks-basic.tslab.app` and record whether the deployed Worker returns the expected R2-backed asset headers. |
| hono-slides-owa | P2 | Stabilize compile-time OGP metadata generation | Make LinkCard OGP generation deterministic by adding a cache, fixture, or opt-in refresh path so generated slide output no longer changes with network availability. |

## Dev Auto Mode

Status: not implemented.

Current router shape: `DecksRouterOptions.dev` accepts `boolean | DeckDevResolver`. It does not accept the older planned `dev: "auto"` mode.

Decision needed: either implement `dev: "auto"` or drop the feature from the design docs.

If implemented, the work is:

- Extend the router dev option type to include `"auto"`.
- Resolve `"auto"` to enabled only when a local development I/O adapter is present.
- Add router tests proving auto mode enables local dev routes when local I/O exists and keeps them unavailable otherwise.
- Verify with the focused router tests and the package check.

Likely files:

- `packages/decks/src/server/router.ts`
- `packages/decks/test/router.test.ts`
- Any type exports that expose the router options.

## Presenter Improvements

Status: partially implemented presenter route, unfinished workflow polish.

Current state:

- `/:slug/presenter` exists.
- It renders current slide, next-slide preview, and speaker notes.
- It does not yet provide a fuller presenter control/status surface.
- The presenter viewer-control behavior still needs safety and DX tightening.

Remaining work:

- Avoid resolving presenter control state when viewer controls are disabled.
- Keep `presenter: false` as an explicit route disable switch.
- Support string env values such as `"true"` in the basic sample presenter gate.
- Add presenter controls for previous/next navigation.
- Add presenter status elements for slide position, clock, and connection state.
- Forward presenter control commands to the projection iframe.
- Update presenter position from `hono-decks:state`.
- Harden presenter message handling by checking both `event.source` and `event.origin`.
- Document presenter configuration, route gating, and viewer-control insertion behavior.

Likely files:

- `packages/decks/src/server/router.ts`
- `packages/decks/src/renderer/presentation-page.ts`
- `packages/decks/test/router.test.ts`
- `examples/basic/src/decks.config.ts`
- `examples/basic/test/worker-sample.test.ts`
- `README.md`

Suggested verification:

```bash
bunx vitest run packages/decks/test/router.test.ts
bunx vitest run examples/basic/test/worker-sample.test.ts examples/basic/test/dev-scripts.test.ts
bunx vitest run packages/decks/test
git diff --check
```
