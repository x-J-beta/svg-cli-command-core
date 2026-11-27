import test from "node:test";
import assert from "node:assert/strict";
import { Shape } from "svg-cli-command-core/plugins";
import { BoxPlugin } from "../dist/plugins/box/BoxPlugin.js";
import { BoxShapeProvider } from "../dist/plugins/box/BoxShapeProvider.js";
import { BoxFillHandler } from "../dist/plugins/box/BoxFillHandler.js";
import { BoxLabelHandler } from "../dist/plugins/box/BoxLabelHandler.js";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { FixedSvgRepository } from "./helpers/FixedSvgRepository.mjs";

class PartDouble extends Shape {
  #tag;
  constructor(type, id, values) {
    super(id); this.#tag = type;
    const names = type === "rect" ? ["x", "y", "width", "height", "fill"] : ["x", "y", "text"];
    names.forEach((name, index) => this.writeProperty(name, name === "fill" || name === "text" ? values[index] : Number(values[index])));
  }
  get tagName() { return this.#tag; }
  get propertyDefinitions() {
    return [...super.propertyDefinitions, ...["x", "y", "width", "height"].map((name) => ({ name, type: "number" })),
      { name: "text", type: "string" }];
  }
}

function editor(files) {
  const assembly = new CliAssembly();
  assembly.extensions.activate(new BoxPlugin());
  const repository = new FixedSvgRepository(assembly.factory, files);
  const session = assembly.createSession(repository);
  const tokenizer = new Tokenizer();
  return { assembly, session, repository, run: (line) => assembly.dispatcher.execute(tokenizer.tokenize(line), session) };
}

test("B01 box registers and creates its subtree independently with supplied part doubles", () => {
  const entries = { shapes: [], attributes: [], decorators: [] };
  new BoxPlugin().activate({
    registerShape: (entry) => entries.shapes.push(entry),
    registerAttribute: (entry) => entries.attributes.push(entry),
    registerDecorator: (entry) => entries.decorators.push(entry),
    createShape: (type, id, args) => new PartDouble(type, id, args),
  });
  const box = entries.shapes[0].create("n1", ["120", "100", "160", "60", "开始"]);
  assert.equal(box.type, "box");
  assert.deepEqual(box.asContainer().children.map((part) => part.id), ["n1-rect", "n1-label"]);
  assert.equal(box.asContainer().children[1].readProperty("y"), 135);
  assert.equal(box.asContainer().children[0].readProperty("fill"), "#4a90d9");
  assert.deepEqual(entries.attributes.map((entry) => entry.name), ["box-fill", "box-label"]);
  assert.equal(entries.decorators[0].decorate({ shape: { type: "box" } }), "(box)");
  assert.ok(entries.attributes[0] instanceof BoxFillHandler);
  assert.ok(entries.attributes[1] instanceof BoxLabelHandler);
});

test("B02 box fill and label each undo and redo in a single unit", async () => {
  const { run, session } = editor();
  await run("init");
  assert.deepEqual(await run('create box n1 120 100 160 60 "开始"'),
    ["box#n1 created (g#n1 + rect#n1-rect + text#n1-label)"]);
  await run("set n1 fill #f5a623");
  assert.equal(session.document.findActiveById("n1-rect").readProperty("fill"), "#f5a623");
  await run("undo");
  assert.equal(session.document.findActiveById("n1-rect").readProperty("fill"), "#4a90d9");
  await run("redo");
  assert.equal(session.document.findActiveById("n1-rect").readProperty("fill"), "#f5a623");
  await run('set n1 label "处理数据 v2"');
  assert.deepEqual(await run("undo"), ['box#n1 label restored: "开始"']);
  assert.equal(session.document.findActiveById("n1-label").textContent, "开始");
  await run("redo");
  assert.equal(session.document.findActiveById("n1-label").textContent, "处理数据 v2");
});

test("B03 nesting, geometry, protected parts, subtree deletion and identity-preserving restoration", async () => {
  const { run, session } = editor();
  for (const line of ["init", "create g outer", 'create box n1 1 2 30 40 title in outer',
    'create box n2 2 3 10 20 nested in n1', "move n1 10 20", "scale n1 2"]) await run(line);
  assert.equal(session.document.findActiveById("n2-rect").readProperty("x"), 24);
  await run("undo"); await run("undo");
  const before = await run("tree");
  for (const command of ["delete n1-rect", "delete n1-label", "addto outer n1-rect", "group bad n1-label", "ungroup n1"]) {
    await assert.rejects(run(command), /required child|cannot ungroup composite shape/);
    assert.deepEqual(await run("tree"), before);
  }
  await run("front n1-rect"); await run("undo");
  const box = session.document.findActiveById("n1");
  await run("delete n1");
  assert.throws(() => session.document.findActiveById("n2-label"), /no such shape/);
  await run("undo");
  assert.equal(session.document.findActiveById("n1"), box);
  assert.deepEqual(await run("tree"), before);
});

test("B04 root and derived id collisions reject the entire creation", async () => {
  for (const existing of ["n1", "n1-rect", "n1-label"]) {
    const { run, session } = editor();
    await run("init"); await run(`create g ${existing}`);
    await assert.rejects(run("create box n1 1 2 3 4 title"), /id already exists/);
    assert.deepEqual(session.document.visibleShapes().map((shape) => shape.id), [existing]);
  }
});

test("B05 box roundtrip preserves extras and disabled plugins downgrade to g", async () => {
  const { run, session, repository } = editor();
  await run("init"); await run("create box n1 1 2 30 40 title"); await run("save box.svg");
  assert.match(repository.content("box.svg"), /data-kind="box"/);
  await run("read box.svg");
  assert.equal(session.document.findActiveById("n1").type, "box");
  const without = new CliAssembly();
  const downgraded = await new FixedSvgRepository(without.factory, { "box.svg": repository.content("box.svg") }).read("box.svg");
  assert.equal(downgraded.document.findActiveById("n1").type, "g");
  assert.equal(downgraded.document.findActiveById("n1").svgAttributes().get("data-kind"), "box");
});

test("B06 malformed and duplicate-id box input preserves document and redo history", async () => {
  const { run, session } = editor({
    "missing.svg": '<svg><g id="n1" data-kind="box"><rect id="n1-rect"/></g></svg>',
    "wrong.svg": '<svg><g id="n1" data-kind="box"><circle id="n1-rect"/><text id="n1-label"/></g></svg>',
    "duplicate.svg": '<svg><g id="n1" data-kind="box"><rect id="n1-rect"/><text id="n1-label"/></g><circle id="n1-label"/></svg>',
  });
  await run("init"); await run("create rect r 1 2 3 4"); await run("set r x 7"); await run("undo");
  const before = await run("tree");
  for (const name of ["missing", "wrong", "duplicate"]) {
    await assert.rejects(run(`read ${name}.svg`), /invalid box structure|id already exists/);
    assert.deepEqual(await run("tree"), before);
  }
  await run("redo");
  assert.equal(session.document.findActiveById("r").readProperty("x"), 7);
});

test("B07 creation validates complete arguments and derived coordinates", () => {
  const provider = new BoxShapeProvider((type, id, args) => new PartDouble(type, id, args));
  for (const args of [[], ["0", "0", "-1", "2", "x"], ["NaN", "0", "1", "2", "x"],
    ["0", String(Number.MAX_VALUE), "1", String(Number.MAX_VALUE), "x"]]) {
    assert.throws(() => provider.create("n1", args));
  }
});
