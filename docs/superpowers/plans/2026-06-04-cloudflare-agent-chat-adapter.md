# Cloudflare Agent Chat Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standard Hono router callback adapter that forwards deck chat requests to Cloudflare Agents using per-deck per-session instance names.

**Architecture:** The router still owns the dev route surface and accepts an `agentChat` callback. The adapter builds `/agents/{agentPath}/{agentInstanceName}/chat` requests and delegates routing to the official `routeAgentRequest` function supplied by the Worker app.

**Tech Stack:** TypeScript, Hono, Cloudflare Agents SDK routing contract, Vitest.

---

### Task 1: Adapter

**Files:**
- Create: `src/cloudflare-agent-chat.ts`
- Create: `test/cloudflare-agent-chat.test.ts`
- Modify: `src/mod.ts`
- Modify: `src/index.ts`
- Modify: `src/types.ts`
- Modify: `README.md`

- [x] **Step 1: Write failing tests**

Cover routing to `/agents/slide-assistant/{agentInstanceName}/chat`, fallback handling, and unhandled route responses.

- [x] **Step 2: Implement adapter**

Create `createCloudflareDeckAgentChat({ agentPath, routeAgentRequest, fallback })`.

- [x] **Step 3: Export adapter**

Export adapter and input types from `src/mod.ts`.

- [x] **Step 4: Update sample worker**

Make `/api/agent/suggest` derive the Agent instance name from optional `slug` and `sessionId`.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- test/cloudflare-agent-chat.test.ts test/router.test.ts
npm run check
```

### Self-Review

- Spec coverage: Uses per-deck/session Agent instance naming.
- Boundary check: Adapter forwards to Agents but still returns proposals/results to Hono.
- Placeholder scan: No placeholders.
