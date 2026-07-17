const { spawnSync } = require("node:child_process");
const Module = require("node:module");

if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    process.stderr.write("Usage: node scripts/run-with-typescript-parser.cjs <command> [...args]\n");
    process.exitCode = 1;
  } else {
    const preload = `--require=${JSON.stringify(__filename)}`;
    const result = spawnSync(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(" "),
      },
    });

    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} else {
  // HonoX's dependency scanner currently uses typescript-estree, whose public
  // TypeScript API support stops at 6.x. Keep that parser on TS 6 while the
  // package build and project typechecks run on the root TypeScript 7.
  const load = Module._load;
  Module._load = function loadWithCompatibleTypeScript(request, parent, isMain) {
    return load.call(this, request === "typescript" ? "typescript-parser" : request, parent, isMain);
  };
}
