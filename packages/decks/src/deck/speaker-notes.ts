export interface SpeakerNotesExtraction {
  body: string;
  notes?: string;
}

export function extractMdxCommentSpeakerNotes(source: string): SpeakerNotesExtraction {
  const notes: string[] = [];
  const body = source.replace(/\{\/\*([\s\S]*?)\*\/\}/g, (_match, rawNote: string) => {
    const note = normalizeSpeakerNote(rawNote);
    if (note) notes.push(note);
    return "";
  });

  return {
    body,
    ...(notes.length ? { notes: notes.join("\n\n") } : {}),
  };
}

export function combineSpeakerNotes(...notes: Array<string | undefined>): string | undefined {
  const combined = notes.map((note) => note?.trim()).filter((note): note is string => Boolean(note));
  return combined.length ? combined.join("\n\n") : undefined;
}

function normalizeSpeakerNote(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
