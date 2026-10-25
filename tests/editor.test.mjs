import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join, dirname, resolve, basename } from "node:path";
import { EditorSession } from "../dist/application/EditorSession.js";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { FileSvgRepository } from "../dist/infrastructure/svg/FileSvgRepository.js";

function editor() {
  const session = new EditorSession(new FileSvgRepository());
  const dispatcher = new CommandDispatcher();
  const tokenizer = new Tokenizer();
  return { session, run: (line) => dispatcher.execute(tokenizer.tokenize(line), session) };
}

async function directory(t) {
  const folder = await mkdtemp(join(process.cwd(), ".svg-editor-test-"));
  t.after(async () => {
    assert.equal(dirname(resolve(folder)), resolve(process.cwd()));
    assert.ok(basename(folder).startsWith(".svg-editor-test-"));
    await rm(folder, { recursive: true, force: true });
  });
  return folder;
}

const childIds = (shape) => shape.asContainer().children.map((child) => child.id);

test("all six types can be created and geometry changes are one reversible batch", async () => {
  const { session, run } = editor();
  await run("init");
  await run("create g scene");
  await run("create rect r 1 2 3 4 #eee in scene");
  await run("create circle c 10 20 5 red in scene");
  await run("create ellipse e 30 40 6 7 in scene");
  await run("create line l 0 0 20 10 black in scene");
  await run('create text t 5 6 "Hello 世界" in scene');
  await run("move scene 2 -3");
  const shape = (id) => session.document.findActiveById(id);
  assert.equal(shape("r").readProperty("x"), 3);
  assert.equal(shape("c").readProperty("cy"), 17);
  assert.equal(shape("e").readProperty("cx"), 32);
  assert.equal(shape("l").readProperty("x2"), 22);
  assert.equal(shape("t").readProperty("y"), 3);
  await run("undo");
  assert.equal(shape("r").readProperty("x"), 1);
  assert.equal(shape("t").readProperty("y"), 6);
  await run("redo");
  await run("scale scene 2");
  assert.equal(shape("r").readProperty("width"), 6);
  assert.equal(shape("c").readProperty("r"), 10);
  assert.equal(shape("e").readProperty("ry"), 14);
  assert.equal(shape("l").readProperty("x2"), 44);
  assert.equal(shape("t").readProperty("text"), "Hello 世界");
  await run("undo");
  assert.equal(shape("r").readProperty("width"), 3);
});

test("set accepts type-specific geometry and text; invalid attributes preserve redo", async () => {
  const { session, run } = editor();
  await run("init");
  await run('create text t 1 2 "first"');
  await run('set t text "second content"');
  await run("undo");
  await assert.rejects(run("set t width 7"), /unknown attribute: width/);
  await run("redo");
  assert.equal(session.document.findActiveById("t").textContent, "second content");
  await assert.rejects(run("set t id other"), /unknown attribute: id/);
  await run("set t x 0.5");
  await run("set t stroke-width 2");
  await assert.rejects(run("set t stroke-width -1"), /non-negative/);
});

test("groups preserve document order across parents and undo restores exact positions", async () => {
  const { session, run } = editor();
  for (const line of ["init", "create g left", "create g right", "create rect a 0 0 1 1 in left", "create rect tail 0 0 1 1 in left", "create circle b 0 0 1 in right"]) await run(line);
  const a = session.document.findActiveById("a");
  const b = session.document.findActiveById("b");
  await run("group pair b a");
  assert.deepEqual(childIds(session.document.findActiveById("pair")), ["a", "b"]);
  assert.deepEqual(childIds(session.document.findActiveById("left")), ["pair", "tail"]);
  await run("undo");
  assert.deepEqual(childIds(session.document.findActiveById("left")), ["a", "tail"]);
  assert.deepEqual(childIds(session.document.findActiveById("right")), ["b"]);
  assert.equal(session.document.findActiveById("a"), a);
  assert.equal(session.document.findActiveById("b"), b);
  await run("redo");
  assert.deepEqual(childIds(session.document.findActiveById("pair")), ["a", "b"]);
});

test("ancestor/descendant grouping, duplicate members and duplicate group ids fail atomically", async () => {
  const { session, run } = editor();
  for (const line of ["init", "create g outer", "create g inner in outer", "create rect a 0 0 1 1 in inner"]) await run(line);
  const before = (await run("tree")).join("\n");
  await assert.rejects(run("group bad outer a"), /cannot group a container into its own descendant: outer/);
  await assert.rejects(run("group bad a a"), /same shape/);
  await assert.rejects(run("group outer a"), /id already exists/);
  assert.equal((await run("tree")).join("\n"), before);
  assert.equal(session.document.temporaryForCommands().size, 0);
});

test("ungroup promotes children into its original position and preserves the group on undo", async () => {
  const { session, run } = editor();
  for (const line of ["init", "create g scene", "create g inner in scene", "create rect a 0 0 1 1 in inner", "create rect b 0 0 1 1 in inner", "create rect tail 0 0 1 1 in scene"]) await run(line);
  const inner = session.document.findActiveById("inner");
  await run("ungroup inner");
  assert.deepEqual(childIds(session.document.findActiveById("scene")), ["a", "b", "tail"]);
  await run("undo");
  assert.equal(session.document.findActiveById("inner"), inner);
  assert.deepEqual(childIds(inner), ["a", "b"]);
  await run("redo");
  assert.deepEqual(childIds(session.document.findActiveById("scene")), ["a", "b", "tail"]);
  await assert.rejects(run("ungroup scene"), /cannot ungroup top-level container: scene/);
});

test("front, back and indexed addto preserve sibling ordering through undo", async () => {
  const { session, run } = editor();
  for (const line of ["init", "create g g", "create rect a 0 0 1 1 in g", "create rect b 0 0 1 1 in g", "create rect c 0 0 1 1 in g"]) await run(line);
  const g = session.document.findActiveById("g");
  await run("front a"); assert.deepEqual(childIds(g), ["b", "c", "a"]);
  await run("undo"); assert.deepEqual(childIds(g), ["a", "b", "c"]);
  await run("back c"); assert.deepEqual(childIds(g), ["c", "a", "b"]);
  await run("undo");
  await run("addto g a 2"); assert.deepEqual(childIds(g), ["b", "c", "a"]);
  await run("undo"); assert.deepEqual(childIds(g), ["a", "b", "c"]);
  await assert.rejects(run("addto g a 3"), /invalid insertion index/);
});

test("canvas query keeps redo, while successful resize establishes a barrier", async () => {
  const { run } = editor();
  await run("init 400 300"); await run("create rect a 0 0 1 1"); await run("undo");
  assert.deepEqual(await run("canvas"), ["canvas 400x300"]);
  await run("redo");
  await assert.rejects(run("canvas -1 200"), /dimensions/);
  await run("undo"); await run("redo");
  await run("canvas 100 200");
  await assert.rejects(run("undo"), /undo not allowed after io command/);
  await run("set a fill blue"); await run("undo");
});

test("geometry overflow leaves all properties unchanged", async () => {
  const { session, run } = editor();
  await run("init"); await run("create rect r 0.1 0.2 1e308 1");
  await assert.rejects(run("scale r 2"), /finite/);
  assert.equal(session.document.findActiveById("r").readProperty("x"), 0.1);
  assert.equal(session.document.findActiveById("r").readProperty("width"), 1e308);
  await run("set r width 0.3"); await run("scale r 0.1"); await run("undo");
  assert.equal(session.document.findActiveById("r").readProperty("width"), 0.3);
  await assert.rejects(run("scale r 0"), /scale factor must be positive/);
});

test("missing documents, containers, leaf destinations and unsupported types give clear errors", async () => {
  const { run } = editor();
  assert.ok((await run("help")).some((line) => line.startsWith("addto")));
  await assert.rejects(run("tree"), /no document/);
  await run("init"); await run("create rect r 0 0 1 1");
  await assert.rejects(run("create rect b 0 0 1 1 in missing"), /no such container: missing/);
  await assert.rejects(run("create rect b 0 0 1 1 in r"), /not a container: r/);
  await assert.rejects(run("create box b 0 0 1 1"), /unknown shape type: box/);
  await assert.rejects(run("set r x NaN"), /finite/);
});

test("save/read round trip excludes deleted objects, permits paths with spaces and establishes barriers", async (t) => {
  const folder = await directory(t);
  const file = join(folder, "my drawing.svg");
  const { session, run } = editor();
  for (const line of ["init 400 200", "create g flow", "create rect a 1 2 3 4 #abc in flow", 'create text title 3 4 "开始 & <处理>" in flow', "create circle deleted 5 6 7", "delete deleted"]) await run(line);
  await run(`save "${file}"`);
  const saved = await readFile(file, "utf8");
  assert.ok(saved.includes("&amp; &lt;处理&gt;"));
  assert.ok(!saved.includes('id="deleted"'));
  assert.ok(!saved.includes("temporary"));
  await assert.rejects(run("undo"), /undo not allowed/);
  await run("init"); await run(`read "${file}"`);
  assert.equal(session.document.width, 400);
  assert.equal(session.document.findActiveById("title").textContent, "开始 & <处理>");
  await run("set a fill red"); await run("save");
  assert.ok((await readFile(file, "utf8")).includes('fill="red"'));
});

test("failed reads and failed writes preserve the document and its undo history", async (t) => {
  const folder = await directory(t);
  const bad = join(folder, "bad.svg");
  await writeFile(bad, "<svg><rect></svg>");
  const { session, run } = editor();
  await run("init"); await run("create rect a 0 0 1 1");
  const document = session.document;
  await assert.rejects(run(`read "${bad}"`), /invalid SVG/);
  assert.equal(session.document, document);
  await assert.rejects(run(`save "${join(folder, "missing", "a.svg")}"`), /cannot write file/);
  await run("undo");
  assert.throws(() => session.document.findActiveById("a"), /no such shape/);
  await run("redo");
  await assert.rejects(run(`read "${join(folder, "missing.svg")}"`), /cannot read file/);
});

test("failed serialization does not truncate an existing file or establish a barrier", async (t) => {
  const folder = await directory(t);
  const file = join(folder, "safe.svg");
  const { session, run } = editor();
  await run("init"); await run('create text t 0 0 "safe"'); await run(`save "${file}"`);
  const original = await readFile(file, "utf8");
  await run('set t text "bad\u0000value"');
  await assert.rejects(run("save"), /not allowed in XML/);
  assert.equal(await readFile(file, "utf8"), original);
  await run("undo");
  assert.equal(session.document.findActiveById("t").textContent, "safe");
});

test("the documented two-node flowchart can be replayed and tree/show include geometry", async () => {
  const { run } = editor();
  for (const line of ["init 800 600", "create g flowchart", "create g node1 in flowchart", "create rect start 120 100 160 60 #4a90d9 in node1", 'create text start-label 155 135 "开始" in node1', "create g node2 in flowchart", "create rect process 520 100 160 60 #f5a623 in node2", 'create text process-label 545 135 "处理数据" in node2', "create line arrow1 280 130 520 130 black in flowchart", "move node2 0 100", "undo"]) await run(line);
  const tree = (await run("tree")).join("\n");
  assert.ok(tree.includes("rect#process  x=520 y=100 w=160 h=60"));
  assert.ok(tree.includes('text#process-label  (545,135) "处理数据"'));
  const show = (await run("show start")).join("\n");
  assert.ok(show.includes("parent=g#node1"));
  assert.ok(show.includes("width=160"));
});
