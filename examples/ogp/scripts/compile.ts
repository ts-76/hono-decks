import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDeckPaths } from "hono-decks";
import { compileDecks } from "hono-decks/node";
import config from "../hono-decks.config";
import { renderOgpCard } from "./ogp-card";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const root = config.build?.root ?? "decks";
const outDir = config.build?.outDir ?? "src/generated";
const manifest = await compileDecks({
  cwd,
  root,
  out: outDir,
  mountPath: config.mountPath,
  ogpCacheFile: config.build?.ogpCacheFile,
});
const [regularFont, boldFont] = await Promise.all([
  readFile(join(cwd, "assets/fonts/AtkinsonHyperlegible-Regular.otf")),
  readFile(join(cwd, "assets/fonts/AtkinsonHyperlegible-Bold.otf")),
]);

let generated = 0;
for (const deck of manifest.decks) {
  if (deck.meta.draft) continue;
  const paths = createDeckPaths(config.mountPath, deck.slug);
  const png = await renderOgpCard({
    title: deck.meta.title ?? deck.slug,
    description: deck.meta.description,
    author: deck.meta.author,
    path: paths.viewer,
    regularFont,
    boldFont,
  });
  const outputPath = join(cwd, "public", paths.ogImage.replace(/^\//, ""));
  if (await writeWhenChanged(outputPath, png)) generated += 1;
}

console.log(`Compiled ${manifest.decks.length} decks and generated ${generated} changed OGP image(s).`);

async function writeWhenChanged(path: string, contents: Uint8Array): Promise<boolean> {
  const next = Buffer.from(contents);
  try {
    if (Buffer.compare(await readFile(path), next) === 0) return false;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next);
  return true;
}
