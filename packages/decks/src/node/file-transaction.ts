import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dirname } from "./path-utils";

export interface GeneratedFile {
  path: string;
  content: string;
}

/** Stage every file before publishing; restore the previous files on an I/O error.
 * Individual renames are atomic. This is rollback on failure, not a cross-process
 * or crash-atomic filesystem transaction. Failed rollback retains recovery files.
 */
export async function publishGeneratedFiles(files: GeneratedFile[], renameFile = rename): Promise<void> {
  const staged: { path: string; dir: string; next: string; backup?: string }[] = [];
  const published: typeof staged = [];
  let keepRecovery = false;
  try {
    if (new Set(files.map((file) => file.path)).size !== files.length)
      throw new Error("Generated output paths must be unique.");
    for (const file of files) {
      const parent = dirname(file.path);
      await mkdir(parent, { recursive: true });
      const dir = await mkdtemp(join(parent, ".hono-decks-"));
      const entry: (typeof staged)[number] = { path: file.path, dir, next: join(dir, "next") };
      staged.push(entry);
      await writeFile(entry.next, file.content, "utf8");
      let previous: Uint8Array;
      try {
        previous = await readFile(file.path);
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") continue;
        throw error;
      }
      entry.backup = join(dir, "previous");
      await writeFile(entry.backup, previous);
    }
    for (const entry of staged) {
      await renameFile(entry.next, entry.path);
      published.push(entry);
    }
  } catch (error) {
    const failures: unknown[] = [];
    for (const entry of published.reverse()) {
      try {
        if (entry.backup) await renameFile(entry.backup, entry.path);
        else await rm(entry.path, { force: true });
      } catch (failure) {
        failures.push(failure);
      }
    }
    if (failures.length) {
      keepRecovery = true;
      throw new AggregateError(
        [error, ...failures],
        `Generated output rollback failed. Recovery files remain in: ${staged.map((entry) => entry.dir).join(", ")}`,
      );
    }
    throw error;
  } finally {
    // Cleanup failure must not turn a successfully published build into a failed one.
    if (!keepRecovery) await Promise.allSettled(staged.map((entry) => rm(entry.dir, { recursive: true, force: true })));
  }
}
