const path = require("node:path");
const { execFileSync } = require("node:child_process");
console.warn("Use npm.cmd run db:migrate. Este atalho executa o migrador versionado.");
try {
  execFileSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("src/lib/db/migrate.ts")], {stdio: "inherit"});
} catch (error) { process.exitCode = typeof error.status === "number" ? error.status : 1; }
