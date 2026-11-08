import { describe, expect, it } from "vite-plus/test";
import { parseRemoteMessage } from "../src/shared/remote-protocol";

describe("remote message validation", () => {
  it("accepts valid state and commands without retaining untrusted fields", () => {
    expect(parseRemoteMessage('{"type":"state","index":1,"stepIndex":0,"notes":"secret"}', 2)).toEqual({
      type: "state",
      index: 1,
      stepIndex: 0,
    });
    expect(parseRemoteMessage('{"type":"command","command":"next"}', 2)).toEqual({
      type: "command",
      command: "next",
    });
  });

  it("rejects malformed, oversized and out-of-range messages", () => {
    for (const input of [
      "{",
      "[]",
      "x".repeat(1025),
      '{"type":"state","index":2,"stepIndex":0}',
      '{"type":"state","index":0,"stepIndex":-1}',
      '{"type":"command","command":"unknown"}',
    ]) {
      expect(parseRemoteMessage(input, 2)).toBeNull();
    }
  });
});
