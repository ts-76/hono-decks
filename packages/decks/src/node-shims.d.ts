declare module "node:fs/promises" {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }

  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
  export function mkdir(path: string, options: { recursive: true }): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function realpath(path: string): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function rm(path: string, options: { recursive?: boolean; force: boolean }): Promise<void>;
}

declare module "node:fs" {
  export interface FSWatcher {
    close(): void;
  }

  export function existsSync(path: string): boolean;
  export function watch(
    path: string,
    options: { recursive: boolean },
    listener: (eventType: "rename" | "change", filename: string | null) => void,
  ): FSWatcher;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:module" {
  export function createRequire(path: string): { resolve(id: string): string };
}

declare module "node:url" {
  export function pathToFileURL(path: string): URL;
  export function fileURLToPath(url: URL): string;
}

declare const process: {
  execPath: string;
  cwd(): string;
  env: {
    NODE_ENV?: string;
  };
};


declare module "node:child_process" {
  export function execFile(command: string, args: string[], options: { cwd: string }, callback: (error: Error | null, stdout: string, stderr: string) => void): void;
}
