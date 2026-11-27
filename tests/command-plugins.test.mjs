import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CommandArguments } from "svg-cli-command-core/plugins";
import { DirCommand } from "../dist/plugins/dir/DirCommand.js";
import { DirPlugin } from "../dist/plugins/dir/DirPlugin.js";
import { NodeDirectoryAdapter } from "../dist/plugins/dir/NodeDirectoryAdapter.js";
import { StatsPlugin } from "../dist/plugins/stats/StatsPlugin.js";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { FixedSvgRepository } from "./helpers/FixedSvgRepository.mjs";

class DirectoryFixture {
  values;
  constructor(values) { this.values = values; }
  currentDirectory() { return "fixture"; }
  async entries() {
    if (this.values instanceof Error) throw this.values;
    return this.values;
  }
}

function editor(directory) {
  const assembly = new CliAssembly();
  assembly.extensions.activate(new DirPlugin(directory));
  assembly.extensions.activate(new StatsPlugin());
  const session = assembly.createSession(new FixedSvgRepository(assembly.factory));
  const tokenizer = new Tokenizer();
  return { session, run: (line) => assembly.dispatcher.execute(tokenizer.tokenize(line), session) };
}

test("C01 dir sorts directories first and includes hidden entries with stable ordering", async () => {
  const entries = [
    { name: "z.svg", isDirectory: false }, { name: "b", isDirectory: true },
    { name: ".hidden", isDirectory: false }, { name: "a", isDirectory: true },
    { name: "A.svg", isDirectory: false },
  ];
  const command = new DirCommand(new DirectoryFixture(entries));
  const args = new CommandArguments([], command.syntax);
  const expected = ["[DIR]  a", "[DIR]  b", "[FILE]  .hidden", "[FILE]  A.svg", "[FILE]  z.svg"];
  assert.deepEqual(await command.execute(args), expected);
  entries.reverse();
  assert.deepEqual(await command.execute(args), expected);
});

test("C02 dir handles empty directories, failures and invalid arguments", async () => {
  assert.deepEqual(await new DirCommand(new DirectoryFixture([])).execute(new CommandArguments([], "dir")), ["(empty directory)"]);
  await assert.rejects(new DirCommand(new DirectoryFixture(new Error("denied"))).execute(new CommandArguments([], "dir")), /^Error: cannot read directory: fixture$/);
  await assert.rejects(new DirCommand(new DirectoryFixture([])).execute(new CommandArguments(["extra"], "dir")), /usage: dir/);
});

test("C03 dir works before init and success or failure preserves document, dirty state and history", async () => {
  const directory = new DirectoryFixture([]);
  const { session, run } = editor(directory);
  const cwd = process.cwd();
  assert.deepEqual(await run("dir"), ["(empty directory)"]);
  await run("init");
  await run("create rect r 1 2 3 4");
  await run("save fixture.svg");
  await run("set r x 9");
  await run("undo");
  const document = session.document;
  const tree = await run("tree");
  await run("dir");
  directory.values = new Error("denied");
  await assert.rejects(run("dir"), /cannot read directory: fixture/);
  assert.equal(session.document, document);
  assert.deepEqual(await run("tree"), tree);
  assert.equal(process.cwd(), cwd);
  await run("redo");
  assert.equal(document.findActiveById("r").readProperty("x"), 9);
  await run("undo");
  assert.equal(document.findActiveById("r").readProperty("x"), 1);
});

test("C04 real filesystem adapter lists only direct children and preserves hidden files", async (t) => {
  const directory = await mkdtemp(join(process.cwd(), ".svg-editor-test-dir-"));
  t.after(async () => {
    assert.equal(resolve(directory, ".."), process.cwd());
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, "nested"));
  await writeFile(join(directory, ".hidden"), "");
  await writeFile(join(directory, "file.svg"), "");
  await writeFile(join(directory, "nested", "child"), "");
  const adapter = new NodeDirectoryAdapter();
  const access = { currentDirectory: () => directory, entries: (path) => adapter.entries(path) };
  assert.deepEqual(await new DirCommand(access).execute(new CommandArguments([], "dir")),
    ["[DIR]  nested", "[FILE]  .hidden", "[FILE]  file.svg"]);
});

test("C05 stats traverses depth-first, counts containers and keeps history intact", async () => {
  const { session, run } = editor(new DirectoryFixture([]));
  await assert.rejects(run("stats"), /no document/);
  await run("init");
  assert.deepEqual(await run("stats"), ["(total 0, containers 0)"]);
  for (const line of ["create g outer", "create text t 1 2 test in outer", "create g inner in outer",
    "create circle c 1 2 3 in inner", "create text t2 4 5 test", "set c cx 99", "undo"]) await run(line);
  assert.deepEqual(await run("stats"), ["text: 2  circle: 1  (total 3, containers 2)"]);
  await run("redo");
  assert.equal(session.document.findActiveById("c").readProperty("cx"), 99);
  await assert.rejects(run("stats extra"), /usage: stats/);
  assert.ok((await run("help")).includes("stats"));
});
