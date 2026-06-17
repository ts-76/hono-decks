export type DeckAgentMode = "chat" | "code";

export interface DeckAgentInstanceNameInput {
  slug: string;
  sessionId: string;
  prefix?: string;
}

export type DeckAgentEditProposal =
  | (DeckAgentEditProposalBase & {
      type: "replacement";
      markdown: string;
    })
  | (DeckAgentEditProposalBase & {
      type: "patch";
      patches: DeckAgentPatch[];
    });

export interface DeckAgentEditProposalBase {
  baseMarkdownHash: string;
  summary?: string;
  validation?: DeckAgentProposalValidation;
}

export interface DeckAgentPatch {
  path: string;
  oldText: string;
  newText: string;
}

export interface DeckAgentProposalValidation {
  ok: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface DeckAgentChatResult {
  source: string;
  message?: string;
  suggestion?: string;
  proposal?: DeckAgentEditProposal;
}

export interface DeckAgentChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function createDeckAgentInstanceName(input: DeckAgentInstanceNameInput): string {
  const slug = encodeNamePart(input.slug, "Agent deck slug");
  const sessionId = encodeNamePart(input.sessionId, "Agent session id");
  const prefix = input.prefix ? `${sanitizePrefix(input.prefix)}-` : "";
  return `${prefix}deck-${slug.length}-${slug}-session-${sessionId.length}-${sessionId}`;
}

export function parseDeckAgentMode(value: unknown): DeckAgentMode {
  return value === "code" ? "code" : "chat";
}

export function createDeckMarkdownHash(markdown: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < markdown.length; index += 1) {
    hash ^= markdown.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `mdx-${(hash >>> 0).toString(16)}`;
}

function encodeNamePart(value: string, label: string): string {
  if (!value) throw new Error(`${label} must not be empty`);
  return encodeURIComponent(value);
}

function sanitizePrefix(value: string): string {
  const encoded = encodeURIComponent(value.trim());
  return encoded || "agent";
}
