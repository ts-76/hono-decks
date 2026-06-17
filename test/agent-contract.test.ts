import { describe, expect, it } from "vitest";
import { createDeckAgentInstanceName, createDeckMarkdownHash, parseDeckAgentMode } from "../src/agent/contract";

describe("agent contract helpers", () => {
  it("derives a deterministic per-deck per-session Agent instance name", () => {
    expect(createDeckAgentInstanceName({ slug: "deck1", sessionId: "session-1" })).toBe(
      "deck-5-deck1-session-9-session-1",
    );
    expect(createDeckAgentInstanceName({ slug: "deck1", sessionId: "session-2" })).toBe(
      "deck-5-deck1-session-9-session-2",
    );
    expect(createDeckAgentInstanceName({ slug: "deck 1", sessionId: "user@example.com" })).toBe(
      "deck-8-deck%201-session-18-user%40example.com",
    );
  });

  it("supports an optional instance prefix", () => {
    expect(createDeckAgentInstanceName({ slug: "deck1", sessionId: "session-1", prefix: "slides" })).toBe(
      "slides-deck-5-deck1-session-9-session-1",
    );
  });

  it("rejects empty slug and session id values", () => {
    expect(() => createDeckAgentInstanceName({ slug: "", sessionId: "session-1" })).toThrow(
      "Agent deck slug must not be empty",
    );
    expect(() => createDeckAgentInstanceName({ slug: "deck1", sessionId: "" })).toThrow(
      "Agent session id must not be empty",
    );
  });

  it("parses agent mode with chat as the default", () => {
    expect(parseDeckAgentMode("code")).toBe("code");
    expect(parseDeckAgentMode("chat")).toBe("chat");
    expect(parseDeckAgentMode("unknown")).toBe("chat");
    expect(parseDeckAgentMode(undefined)).toBe("chat");
  });

  it("creates a stable markdown hash for edit proposals", () => {
    expect(createDeckMarkdownHash("# Title")).toBe(createDeckMarkdownHash("# Title"));
    expect(createDeckMarkdownHash("# Title")).not.toBe(createDeckMarkdownHash("# Title\n\nMore"));
    expect(createDeckMarkdownHash("# Title")).toMatch(/^mdx-[0-9a-f]+$/);
  });
});
