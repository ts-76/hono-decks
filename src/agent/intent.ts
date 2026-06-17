import { parseDeckAgentMode } from "./contract";
import type { DeckAgentMode } from "./contract";

const editIntentPattern =
  /(編集案|修正案|変更案|改善案|編集して|修正して|変更して|直して|書き換|書き直|反映|適用|加筆|追記|追加|内容.*増|増やして|充実させ|ブラッシュアップ|タイトル.*変|見出し.*変)/i;

export function shouldRequestEditProposal(instruction: string): boolean {
  return editIntentPattern.test(instruction.trim());
}

export function resolveDeckAgentMode(mode: unknown, instruction: string): DeckAgentMode {
  const parsedMode = parseDeckAgentMode(mode);
  if (parsedMode === "code") return "code";
  return shouldRequestEditProposal(instruction) ? "code" : "chat";
}
