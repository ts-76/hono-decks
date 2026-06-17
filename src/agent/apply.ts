import { createDeckMarkdownHash } from "./contract";
import type { DeckAgentEditProposal, DeckAgentPatch } from "./contract";

export type ApplyDeckAgentProposalResult =
  | { ok: true; markdown: string; baseMarkdownHash: string }
  | { ok: false; status: 400 | 409 | 422; error: string };

export function applyDeckAgentProposal(
  markdown: string,
  proposal: unknown,
  options: { sourcePath?: string } = {},
): ApplyDeckAgentProposalResult {
  if (!isProposalObject(proposal)) {
    return { ok: false, status: 400, error: "proposal must be an object" };
  }

  const baseMarkdownHash = createDeckMarkdownHash(markdown);
  if (proposal.baseMarkdownHash !== baseMarkdownHash) {
    return {
      ok: false,
      status: 409,
      error: `Proposal targets ${String(proposal.baseMarkdownHash)} but current deck is ${baseMarkdownHash}.`,
    };
  }

  if (proposal.type === "replacement") {
    return applyReplacementProposal(baseMarkdownHash, proposal);
  }

  if (proposal.type === "patch") {
    return applyPatchProposal(markdown, baseMarkdownHash, proposal, options.sourcePath);
  }

  return { ok: false, status: 400, error: "proposal.type must be replacement or patch" };
}

function applyReplacementProposal(
  baseMarkdownHash: string,
  proposal: Partial<DeckAgentEditProposal>,
): ApplyDeckAgentProposalResult {
  if (!("markdown" in proposal) || typeof proposal.markdown !== "string") {
    return { ok: false, status: 400, error: "replacement proposal markdown must be a string" };
  }
  return { ok: true, markdown: proposal.markdown, baseMarkdownHash };
}

function applyPatchProposal(
  markdown: string,
  baseMarkdownHash: string,
  proposal: Partial<DeckAgentEditProposal>,
  sourcePath?: string,
): ApplyDeckAgentProposalResult {
  const patches = "patches" in proposal && Array.isArray(proposal.patches) ? proposal.patches : undefined;
  if (!patches || patches.length === 0) {
    return { ok: false, status: 400, error: "patch proposal patches must be a non-empty array" };
  }

  let nextMarkdown = markdown;
  for (const patch of patches as Partial<DeckAgentPatch>[]) {
    const validation = validatePatch(nextMarkdown, patch, sourcePath);
    if (validation) return validation;
    nextMarkdown = nextMarkdown.replace(patch.oldText as string, patch.newText as string);
  }

  return { ok: true, markdown: nextMarkdown, baseMarkdownHash };
}

function validatePatch(
  markdown: string,
  patch: Partial<DeckAgentPatch>,
  sourcePath?: string,
): ApplyDeckAgentProposalResult | undefined {
  if (sourcePath && patch.path !== sourcePath) {
    return { ok: false, status: 400, error: `Patch path must match current deck source: ${sourcePath}` };
  }
  if (typeof patch.oldText !== "string" || patch.oldText.length === 0) {
    return { ok: false, status: 400, error: "patch oldText must be a non-empty string" };
  }
  if (typeof patch.newText !== "string") {
    return { ok: false, status: 400, error: "patch newText must be a string" };
  }
  const matchCount = markdown.split(patch.oldText).length - 1;
  if (matchCount === 0) return { ok: false, status: 422, error: `Patch oldText was not found: ${patch.oldText}` };
  if (matchCount > 1) return { ok: false, status: 422, error: `Patch oldText is ambiguous: ${patch.oldText}` };
  return undefined;
}

function isProposalObject(value: unknown): value is Partial<DeckAgentEditProposal> {
  return typeof value === "object" && value !== null;
}
