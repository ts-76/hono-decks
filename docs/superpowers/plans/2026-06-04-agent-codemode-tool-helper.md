# Agent Code Mode Tool Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a helper that turns deck editing tools into a Cloudflare Code Mode AI SDK tool.

**Architecture:** The helper composes the write-free deck tool provider with `createCodeTool()`. It accepts an injected executor for tests or creates a `DynamicWorkerExecutor` from the Worker Loader binding in runtime.

**Tech Stack:** `@cloudflare/codemode`, AI SDK tool types, TypeScript, Vitest.

---

### Task 1: Code Mode Tool Helper

**Files:**
- Create: `src/agent-codemode.ts`
- Create: `test/agent-codemode.test.ts`
- Modify: `src/mod.ts`
- Modify: `test/router.test.ts`

- [x] **Step 1: Write failing tests**

Cover wrapping deck tools into `createCodeTool()` and preserving the no-write tool boundary.

- [x] **Step 2: Implement helper**

Create `createDeckCodeModeTool(input)`.

- [x] **Step 3: Export helper**

Export helper and input type from `src/mod.ts`.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- test/agent-codemode.test.ts test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Provides the Code Mode bridge over the approved deck tools.
- Boundary check: The tool provider still exposes no save/write tool.
- Placeholder scan: No placeholders.
