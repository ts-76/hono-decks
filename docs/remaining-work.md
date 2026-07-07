# Remaining Work

This file is the single markdown source for known unfinished work. Keep detailed implementation plans out of separate markdown files unless they are actively being executed.

## Beads Issues

These items are tracked in beads and remain open.

| ID | Priority | Title | Remaining work |
| --- | --- | --- | --- |
| hono-slides-uuo | P1 | Verify deployed R2 smoke after custom domain DNS provisioning | After the custom domain resolves, run `bun run --cwd examples/basic smoke:r2-cache -- --origin https://hono-decks-basic.tslab.app` and record whether the deployed Worker returns the expected R2-backed asset headers. |
