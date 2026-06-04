# Slide Assistant Chat Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the exported `SlideAssistant` Durable Object handle the multi-deck `/chat` route used by the Hono development router.

**Architecture:** The Hono router passes raw MDX context, source path, session id, and mode to the Agent. The Agent returns a chat result, and in `mode: "code"` returns a structured proposal without writing or saving.

**Tech Stack:** Cloudflare Agents SDK, TypeScript, Vitest, existing deck agent contracts.

---

### Task 1: Chat Result And Route

**Files:**
- Modify: `src/agent.ts`
- Modify: `src/router.ts`
- Create: `test/agent.test.ts`
- Modify: `test/router.test.ts`
- Modify: `README.md`

- [x] **Step 1: Write failing tests**

Cover `buildChatResult()` for chat mode, code mode proposal generation, and `SlideAssistant.onRequest()` handling `POST /chat`.

- [x] **Step 2: Implement chat result helper**

Add `buildChatResult(env, input)` returning `DeckAgentChatResult`.

- [x] **Step 3: Implement Agent route**

Handle `POST /chat` in `SlideAssistant.onRequest()`.

- [x] **Step 4: Pass source path through router**

Add `sourcePath` to `HonoSlidesAgentChatInput` so proposals can target directory decks and single-file decks correctly.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- test/agent.test.ts test/router.test.ts test/cloudflare-agent-chat.test.ts
npm run check
```

### Self-Review

- Spec coverage: Cloudflare Agent chat route now returns proposal-capable results.
- Boundary check: Agent creates proposals only; Hono apply/save persists.
- Placeholder scan: No placeholders.
