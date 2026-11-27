import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const transcripts = join(root, "doc/transcript");
async function directory(t) {
  const base = await mkdtemp(join(root, ".svg-editor-test-transcript-"));
  const cwd = join(base, "input");
  await mkdir(cwd);
  await mkdir(join(cwd, "docs"));
  await writeFile(join(cwd, ".hidden"), "");
  await copyFile(join(root, "examples/other.svg"), join(cwd, "other.svg"));
  t.after(async () => {
    assert.equal(resolve(base, ".."), resolve(root));
    await rm(base, { recursive: true, force: true });
  });
  return cwd;
}
function execute(entry, args, input, cwd) {
  const result = spawnSync(process.execPath, [entry, ...args], { input, cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return { stdout: result.stdout, stderr: result.stderr };
}

for (const [name, entryA, argsA, config] of [
  ["cli-1", "dist/main.js", [], "doc/transcript/empty.config.json"],
  ["cli-box", "tests/fixtures/BoxCodeAssembly.mjs", [], "doc/transcript/box.config.json"],
  ["plugins", "dist/main.js", ["--plugins"], "plugins.config.json"],
]) {
  test(`A/B assembly output is byte-identical for ${name}`, async (t) => {
    const cwd = await directory(t);
    const input = await readFile(join(transcripts, `${name}.txt`), "utf8");
    const first = execute(join(root, entryA), argsA, input, cwd);
    const second = execute(join(root, "dist/main.js"), ["--config", join(root, config)], input, cwd);
    assert.deepEqual(second, first);
    assert.equal(first.stdout, await readFile(join(transcripts, `${name}.stdout.txt`), "utf8"));
    assert.equal(first.stderr, await readFile(join(transcripts, `${name}.stderr.txt`), "utf8"));
  });
}
