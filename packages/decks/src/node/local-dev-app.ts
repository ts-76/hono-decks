import { Hono } from "hono";
import { compileMarkdown } from "../compiler/compiler";
import type { LocalDeckIO } from "../deck/model";
import { createDevDeckRuntime } from "../runtime/dev-runtime";
import { decksRouter } from "../server/router";
import { buildDeckManifestFromFileSystem } from "./compile-decks";
import { createLocalDeckIO } from "./local-deck-io";
import type { CreateLocalDeckIOInput } from "./local-deck-io";
import { normalizeMountPath } from "./path-utils";

export interface CreateLocalDevSlidesAppInput {
  cwd: string;
  root: string;
  mountPath?: string;
  watchFileSystem?: CreateLocalDeckIOInput["watchFileSystem"];
}

export interface LocalDevSlidesApp {
  app: Hono;
  localDeckIO: LocalDeckIO;
  stop(): void;
}

export async function createLocalDevSlidesApp(input: CreateLocalDevSlidesAppInput): Promise<LocalDevSlidesApp> {
  const mountPath = normalizeMountPath(input.mountPath ?? "/slides");
  const localDeckIO = createLocalDeckIO({ cwd: input.cwd, root: input.root, watchFileSystem: input.watchFileSystem });
  const initial = await buildDeckManifestFromFileSystem({ cwd: input.cwd, root: input.root, mountPath });
  const runtime = createDevDeckRuntime({
    initialDecks: initial.decks,
    localDeckIO,
    compiler: { compileMarkdown },
    mountPath,
  });
  const stop = runtime.start();
  const app = new Hono();

  app.get("/", (c) => c.redirect(mountPath));
  app.route(
    mountPath,
    decksRouter({
      source: runtime.source,
      dev: true,
    }),
  );

  return { app, localDeckIO, stop };
}
