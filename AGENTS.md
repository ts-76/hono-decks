# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context.

> **Architecture in one line:** Issues live in a local Dolt database
> (`.beads/dolt/`); cross-machine sync uses `bd dolt push/pull` (a
> git-compatible protocol), stored under `refs/dolt/data` on your git
> remote — separate from `refs/heads/*` where your code lives.
> `.beads/issues.jsonl` is a passive export, not the wire protocol.
>
> See [SYNC_CONCEPTS.md](https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md)
> for the one-screen overview and anti-patterns (don't treat JSONL as the
> source of truth; don't `bd import` during normal operation; don't
> reach for third-party Dolt hosting before trying the default).

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd dolt push          # Push beads data to remote
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

## Build & Test

Requires Bun 1.3 and Node.js 24.22.1 (the CI baseline) (the Vite+ managed Node from `vp env` works).

```bash
bun install                                 # one install; the CLI bin works before the first build
bun run --cwd packages/decks test           # unit tests against src (no build needed)
bun run --cwd packages/decks typecheck      # tsc against src
bun run --cwd examples/basic test           # an example (compiles its decks first)
bun run check                               # full gate: build, generate, lint+fmt, typecheck, tests, dist tests, builds
bun run format                              # apply formatting (enforced by `vp check`)
```

`bun run check` builds the package once, compiles the CLI examples (`bun run generate`), then runs every workspace's typecheck and tests in parallel. `*.dist.test.ts` files inspect the published build and run only through `bun run --cwd packages/decks test:dist`.

## Architecture Overview

- `packages/decks` is the published `hono-decks` package. MDX decks are compiled at build time; Workers only load generated modules.
  - Worker-safe runtime: `src/server`, `src/renderer`, `src/source`, `src/deck`, `src/client`, `src/shared` (entries `hono-decks`, `hono-decks/advanced`, `hono-decks/client`).
  - Node-only build side: `src/node`, `src/generator`, `src/compiler`, `src/parser`, `src/routing`, `src/adapters` (entries `hono-decks/node`, `hono-decks/vite`, `hono-decks/cli`). `test/source-structure.test.ts` enforces this boundary.
- `hono-decks.config.ts` is build-only (`mountPath` + `build`). The compiler embeds `mountPath` in the generated module, whose `createDecks(options)` takes all runtime options.
- Two integrations: CLI init registers `#decks` and writes compiler-owned modules to the ignored `.hono-decks/` cache (explicit legacy output directories remain supported), and the Vite plugin serves the same modules virtually as `virtual:hono-decks` (plus `virtual:hono-decks/honox`).
- `examples/*` and `docs` consume the workspace package like an app would. `examples/void` and `fixtures/*` install published or packed builds and are verified by `scripts/verify-*.mjs`.

## Conventions & Patterns

- Conventional Commits drive semantic-release; PRs are squash-merged, so the final squash message decides the release (`feat!:` / `BREAKING CHANGE:` for majors).
- Router options merge with one rule: objects merge recursively, arrays concatenate, other values (including `false` and functions) replace.
- HTML routes defer missing decks and disabled surfaces to the host app's `notFound` handler.

Basic, Minimal, and OGP use `cf dev/build/deploy` with `cloudflare.config.ts`. Production identities are selected with `--mode production`. Their `wrangler.config.ts` contains the cf bundler hooks; Wrangler remains an implementation dependency. Runtime options live in `decks/index.ts`.

Generic CLI init keeps build settings in `decks/config.ts` and runtime settings in `decks/index.ts`. package.json `hono-decks.configFile` records the build config path, so ordinary compile commands need no path argument. Explicit `--config` takes precedence; existing root configs still work.
