import { describe, expect, it } from "vitest";
import { resolveDeckAgentMode, shouldRequestEditProposal } from "../src/agent-intent";

describe("agent edit intent", () => {
  it("treats add requests as edit proposal requests", () => {
    const instruction = "Editingスライドに、承認後にapply routeで保存する説明を1行追加してください";

    expect(shouldRequestEditProposal(instruction)).toBe(true);
    expect(resolveDeckAgentMode(undefined, instruction)).toBe("code");
  });
});
