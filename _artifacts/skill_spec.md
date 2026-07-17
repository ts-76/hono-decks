# hono-decks — Skill Spec

`hono-decks` compiles MDX slide decks into TypeScript modules at build time and serves the generated routes from Hono applications and Cloudflare Workers. The Agent Skill is a single router-style skill: it classifies the developer's task, then loads only the relevant getting-started, MDX authoring, styling, or integration reference.

## Domains

| Domain | Description | Skills |
| --- | --- | --- |
| Building and shipping slide decks | Authoring, styling, application integration, and production-safe delivery | `hono-decks` |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| --- | --- | --- | --- | --- |
| `hono-decks` | core | Building and shipping slide decks | Setup, MDX, themes, generated kit, Hono/Vite/Wrangler integration, embeds and exports | 8 |

## Failure Mode Inventory

### hono-decks (8 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | --- | --- | --- | --- |
| 1 | Editing generated modules instead of source decks | HIGH | `packages/decks/README.md#quick-start` | — |
| 2 | Running Node compilation inside the Worker | CRITICAL | `packages/decks/README.md#public-entries` | — |
| 3 | Duplicating mount paths and route strings | HIGH | `packages/decks/README.md#one-config-one-runtime-kit` | — |
| 4 | Passing executable values to client islands | HIGH | `packages/decks/src/renderer/jsx-renderer.ts` | — |
| 5 | Using Fire syntax on ordinary inline markup | MEDIUM | `packages/decks/src/generator/mdx/syntax.ts` | — |
| 6 | Treating external embeds as a CORS setting | HIGH | `packages/decks/README.md#embedding` | — |
| 7 | Publishing browser export without authorization | CRITICAL | `packages/decks/src/server/browser-export.ts` | — |
| 8 | Generating Slidev or UnoCSS syntax for hono-decks | HIGH | Maintainer interview and MDX syntax source | — |

## Tensions

| Tension | Skills | Agent implication |
| --- | --- | --- |
| Simple setup versus build/runtime separation | `hono-decks` | A shortcut-seeking agent may pull Node compilation into Worker runtime code. |
| Visual freedom versus a fixed presentation canvas | `hono-decks` | Viewport-specific styling can clip slides or break print and reduced-motion output. |
| Convenient routes versus production exposure | `hono-decks` | Enabling presenter, embed, or export routes without policy can expose sensitive or billable operations. |

## Cross-References

The skill is intentionally self-routing rather than split into separate skills. Cross-topic pointers live inside its routing table and reference files.

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| --- | --- | --- |
| `hono-decks` | — | `getting-started`, `authoring-mdx`, `styling`, `integrating` |

## Recommended Skill File Structure

- **Core skills:** one `hono-decks` skill
- **Framework skills:** none; Hono is intrinsic to the core skill
- **Lifecycle skills:** handled internally by the `getting-started` route
- **Composition skills:** none currently
- **Reference files:** `references/getting-started.md`, `references/authoring-mdx.md`, `references/styling.md`, `references/integrating.md`, plus explicit advanced references for R2 assets, Browser Rendering export, OGP generation, and custom sources

The styling reference is opinionated about slide-specific quality: readable presentation-sized type and content that fits the fixed 16:9 canvas. It does not require responsive layout behavior. The authoring reference covers all basic syntax, while components, Fire, embeds, client islands, and other advanced constructs are progressively disclosed.

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| --- | --- | --- |
| Hono | Router mounting, middleware context, application-owned routes | No; intrinsic to the core skill |
| Vite / HonoX | Pre-start compilation and watcher integration | No; route through `integrating` |
| Cloudflare Workers / Wrangler | Custom build, Browser Rendering, secrets, R2 assets | No; route through `integrating` |

## Documentation Read

- `README.md`
- `README.ja.md`
- `packages/decks/README.md`
- `packages/decks/README.ja.md`
- `examples/minimal/README.md`
- `examples/honox/README.md`
- `examples/ogp/README.md`
- `docs/decks/product/deck.mdx`

The deep read also covered public package entries, configuration and routing source, frontmatter parsing, MDX syntax transforms, client-island serialization, presentation CSS, compile and init flows, embed/export security paths, representative example decks, and the test inventory. The public GitHub repository currently has no issues to mine for recurring reports.
