import type { DeckAgentChatResult, DeckAgentEditProposal } from "./agent-contract";

export function parseCodeModeGenerationResult(result: unknown): DeckAgentChatResult | undefined {
  return extractDeckAgentChatResult(result, 0);
}

function extractDeckAgentChatResult(value: unknown, depth: number): DeckAgentChatResult | undefined {
  if (depth > 5) return undefined;

  const parsed = typeof value === "string" ? parseJson(value) : value;
  if (isDeckAgentChatResult(parsed)) return normalizeDeckAgentChatResult(parsed);
  if (isDeckAgentEditProposal(parsed)) return createResultFromProposal(parsed);
  if (!isRecord(parsed)) return undefined;

  const textResult = extractDeckAgentChatResult(readString(parsed, "text"), depth + 1);
  if (textResult) return textResult;

  for (const key of ["output", "result"]) {
    const nestedResult = extractDeckAgentChatResult(parsed[key], depth + 1);
    if (nestedResult) return nestedResult;
  }

  for (const collectionKey of ["toolResults", "staticToolResults", "dynamicToolResults"]) {
    const collectionResult = extractFromCollection(parsed[collectionKey], depth + 1);
    if (collectionResult) return collectionResult;
  }

  const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
  for (const step of steps) {
    const stepResult = extractDeckAgentChatResult(step, depth + 1);
    if (stepResult) return stepResult;
  }

  return undefined;
}

function extractFromCollection(value: unknown, depth: number): DeckAgentChatResult | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    const result = extractDeckAgentChatResult(item, depth);
    if (result) return result;
  }
  return undefined;
}

function normalizeDeckAgentChatResult(result: DeckAgentChatResult): DeckAgentChatResult {
  if (!result.proposal) return result;
  const summary = result.proposal.summary || result.message || "編集 proposal を作成しました。";
  return {
    source: result.source,
    message: summary,
    proposal: {
      ...result.proposal,
      summary,
    },
  };
}

function createResultFromProposal(proposal: DeckAgentEditProposal): DeckAgentChatResult {
  const summary = proposal.summary || "編集 proposal を作成しました。";
  return {
    source: "workers-ai-codemode",
    message: summary,
    proposal: {
      ...proposal,
      summary,
    },
  };
}

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  const json = extractJsonObject(value);
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function extractJsonObject(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(trimmed);
  if (fenced) return fenced[1];

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : undefined;
}

function isDeckAgentChatResult(value: unknown): value is DeckAgentChatResult {
  if (!isRecord(value) || typeof value.source !== "string") return false;
  if ("proposal" in value && value.proposal !== undefined && !isDeckAgentEditProposal(value.proposal)) return false;
  return true;
}

function isDeckAgentEditProposal(value: unknown): value is DeckAgentEditProposal {
  if (!isRecord(value) || typeof value.baseMarkdownHash !== "string") return false;
  if (value.type === "replacement") return typeof value.markdown === "string";
  if (value.type === "patch") return Array.isArray(value.patches);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const entry = value[key];
  return typeof entry === "string" ? entry : undefined;
}
