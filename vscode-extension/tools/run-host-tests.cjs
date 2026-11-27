const { spawn, spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const developmentPath = resolve(process.env.SVG_EXTENSION_TEST_PATH || root);
let executable = process.env.VSCODE_EXECUTABLE;
if (!executable && process.platform === "win32") {
  const location = spawnSync("where.exe", ["code"], { encoding: "utf8" });
  const launcher = location.stdout?.trim().split(/\r?\n/u)[0];
  if (location.status !== 0 || !launcher) throw new Error("VS Code was not found on PATH");
  executable = resolve(dirname(launcher), "..", "Code.exe");
}
if (!executable || !existsSync(executable)) throw new Error("Set VSCODE_EXECUTABLE to an installed VS Code executable");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, [
  "--new-window", "--disable-extensions", "--skip-welcome", "--skip-release-notes",
  `--extensionDevelopmentPath=${developmentPath}`,
  `--extensionTestsPath=${resolve(__dirname, "host-suite.cjs")}`,
  `--user-data-dir=${resolve(root, "dist/host-user-data")}`,
  `--extensions-dir=${resolve(root, "dist/host-extensions")}`,
  resolve(root, "examples"),
], { env, stdio: "inherit" });
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
