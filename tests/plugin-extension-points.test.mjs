import test from "node:test";
import assert from "node:assert/strict";
import { ContainerShape, ShapeContainer } from "svg-cli-command-core/plugins";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { FixedSvgRepository } from "./helpers/FixedSvgRepository.mjs";

class EchoCommand {
  name = "fixture-echo";
  syntax = "fixture-echo <value>";
  execute(args) {
    args.requireCount(1);
    return [args.at(0)];
  }
}

class BundleContainer extends ShapeContainer {
  get canUngroup() { return false; }
  canRemoveChild(shape) { return shape.id !== `${this.owner.id}-part`; }
}

class Bundle extends ContainerShape {
  constructor(id) { super(id, BundleContainer); }
  get type() { return "fixture-bundle"; }
  get tagName() { return "g"; }
  svgAttributes() { return new Map([...super.svgAttributes(), ["data-kind", this.type]]); }
}

class BundleProvider {
  name = "fixture-bundle";
  svgTag = "g";
  #createShape;
  constructor(createShape) { this.#createShape = createShape; }
  create(id, values) {
    assert.deepEqual(values, []);
    const bundle = new Bundle(id);
    bundle.asContainer().appendDetachedChild(this.#createShape("rect", `${id}-part`, ["1", "2", "3", "4"]));
    return bundle;
  }
  fromSvg(input) {
    if (!input.children.some((child) => child.id === `${input.id}-part` && child.type === "rect")) {
      throw new Error("bundle is missing its rectangle");
    }
    const bundle = new Bundle(input.id);
    for (const child of input.children) bundle.asContainer().appendDetachedChild(child);
    return bundle;
  }
}

class PairAttribute {
  name;
  constructor(name = "fixture-pair") { this.name = name; }
  handles(shape, attribute) { return shape.type === "g" && attribute === "pair"; }
  apply(shape, _attribute, value, transaction) {
    transaction.set(shape.children[0].id, "x", "17");
    if (value === "throw") throw new Error("failure after first write");
    transaction.set(shape.children[0].id, "y", value);
    return { applied: "pair updated", undone: "pair restored" };
  }
}

class RowTag {
  name;
  #format;
  constructor(name, format) { this.name = name; this.#format = format; }
  decorate(row) { return this.#format(row); }
}

class FixturePlugin {
  #register;
  constructor(register) { this.#register = register; }
  activate(context, options) { this.#register(context, options); }
}

function setup(files) {
  const assembly = new CliAssembly();
  const repository = new FixedSvgRepository(assembly.factory, files);
  const session = assembly.createSession(repository);
  const tokenizer = new Tokenizer();
  const activate = (register, options) => assembly.extensions.activate(new FixturePlugin(register), options);
  const run = (line) => assembly.dispatcher.execute(tokenizer.tokenize(line), session);
  return { activate, repository, run, session };
}

function activateBundle(activate) {
  activate((context) => context.registerShape(new BundleProvider(context.createShape)));
}

test("P01 registered commands supply execution and help without a document", async () => {
  const { activate, run } = setup();
  const baseline = await run("help");
  await assert.rejects(run("fixture-echo hello"), /unknown command: fixture-echo/);
  activate((context, options) => {
    assert.deepEqual(options, { enabled: true });
    context.registerCommand(new EchoCommand());
  }, { enabled: true });
  assert.deepEqual(await run("help"), [...baseline, "fixture-echo <value>"]);
  assert.deepEqual(await run('fixture-echo "hello world"'), ["hello world"]);
  await assert.rejects(run("fixture-echo"), /fixture-echo <value>/);
});

test("P02 shape provider creates, moves, serializes and reads a complete compound shape", async () => {
  const { activate, repository, run, session } = setup();
  activateBundle(activate);
  await run("init");
  await run("create g outer");
  await run("create fixture-bundle sample in outer");
  const bundle = session.document.findActiveById("sample");
  assert.equal(bundle.type, "fixture-bundle");
  assert.equal(bundle.asContainer().children[0].readProperty("x"), 1);
  await run("move sample 8 9");
  assert.equal(bundle.asContainer().children[0].readProperty("x"), 9);
  await run("undo");
  assert.equal(bundle.asContainer().children[0].readProperty("x"), 1);
  await run("save fixture.svg");
  assert.match(repository.content("fixture.svg"), /<g\b(?=[^>]*\bid="sample")(?=[^>]*\bdata-kind="fixture-bundle")[^>]*>/);
  await run("read fixture.svg");
  assert.equal(session.document.findActiveById("sample").type, "fixture-bundle");
  assert.equal(session.document.findActiveById("sample-part").parent.owner.id, "sample");
});

test("P03 missing shape providers preserve ordinary g and other data-kind attributes", async () => {
  const { run, session } = setup({
    "unregistered.svg": '<svg><g id="b" data-kind="fixture-bundle"><rect id="part" data-kind="g"/></g></svg>',
  });
  await run("read unregistered.svg");
  assert.equal(session.document.findActiveById("b").type, "g");
  assert.equal(session.document.findActiveById("part").svgAttributes().get("data-kind"), "g");
  await assert.rejects(run("create fixture-bundle b2"), /unknown shape type: fixture-bundle/);
});

test("P04 full-subtree validation and container policies preserve the active document", async () => {
  const { activate, run, session } = setup({
    "malformed.svg": '<svg><g id="b" data-kind="fixture-bundle"><circle id="b-part"/></g></svg>',
    "duplicate.svg": '<svg><g id="b" data-kind="fixture-bundle"><rect id="b-part"/></g><text id="b-part"/></svg>',
  });
  activateBundle(activate);
  await run("init");
  await run("create g outer");
  await run("create rect other 1 2 3 4");
  await run("create fixture-bundle b in outer");
  const baseline = await run("tree");
  for (const [command, error] of [
    ["create fixture-bundle other", /id already exists: other/],
    ["create rect b-part 1 2 3 4", /id already exists: b-part/],
    ["ungroup b", /cannot ungroup composite shape: b/],
    ["delete b-part", /cannot remove required child: b-part/],
    ["addto outer b-part", /cannot remove required child: b-part/],
    ["group rejected other b-part", /cannot remove required child: b-part/],
    ["read malformed.svg", /bundle is missing its rectangle/],
    ["read duplicate.svg", /id already exists: b-part/],
  ]) {
    await assert.rejects(run(command), error);
    assert.deepEqual(await run("tree"), baseline);
  }
  await run("delete b");
  assert.throws(() => session.document.findActiveById("b-part"), /no such shape/);
  await run("undo");
  assert.deepEqual(await run("tree"), baseline);
});

test("P05 decorated tree rows are independent, ordered and absent by default", async () => {
  const { activate, run } = setup();
  await run("init");
  await run("create g frame");
  await run("create rect r 1 2 3 4 in frame");
  const baseline = ["svg (800x600)", "└── g#frame", "    └── rect#r  x=1 y=2 w=3 h=4"];
  assert.deepEqual(await run("tree"), baseline);
  activate((context) => {
    context.registerDecorator(new RowTag("container", (row) => row.shape?.isContainer ? "(container)" : undefined));
    context.registerDecorator(new RowTag("text", (row) => row.text === "g#frame" ? "(frame)" : undefined));
  });
  assert.deepEqual(await run("tree"), [baseline[0], `${baseline[1]} (container) (frame)`, baseline[2]]);
  assert.deepEqual(await run("tree frame"), ["g#frame (container) (frame)", baseline[2].trimStart()]);
  assert.equal((await run("show frame"))[0], "g#frame  parent=svg");
});

test("P06 tree rows carry changes since a successful baseline, including undo and failed edits", async () => {
  const { activate, run } = setup();
  activate((context) => context.registerDecorator(new RowTag("fixture-edited", (row) => row.changedSinceBaseline ? "*" : undefined)));
  await run("init");
  assert.deepEqual(await run("tree"), ["svg (800x600)"]);
  await run("create g frame");
  await run("create rect r 1 2 3 4 in frame");
  assert.ok((await run("tree")).every((row) => row.endsWith(" *")));
  await run("save clean.svg");
  const clean = await run("tree");
  assert.ok(clean.every((row) => !row.endsWith(" *")));
  await assert.rejects(run("set r x NaN"), /finite number/);
  assert.deepEqual(await run("tree"), clean);
  await run("set r x 9");
  const edited = await run("tree");
  assert.ok(edited.every((row) => row.endsWith(" *")));
  await assert.rejects(run("save readonly.svg"), /cannot write file/);
  assert.deepEqual(await run("tree"), edited);
  await run("undo");
  assert.deepEqual(await run("tree"), clean.map((row) => `${row} *`));
  await run("read clean.svg");
  assert.deepEqual(await run("tree"), clean);
});

test("P07 attribute handler edits multiple properties as one undo unit with Phase 1 fallback", async () => {
  const { activate, run, session } = setup();
  await run("init");
  await run("create g frame");
  await run("create rect r 1 2 3 4 in frame");
  await assert.rejects(run("set frame pair 22"), /unknown attribute: pair/);
  activate((context) => context.registerAttribute(new PairAttribute()));
  await run("set r fill red");
  assert.equal(session.document.findActiveById("r").readProperty("fill"), "red");
  await assert.rejects(run("set r pair 22"), /unknown attribute: pair/);
  const position = () => ["x", "y"].map((name) => session.document.findActiveById("r").readProperty(name));
  assert.deepEqual(await run("set frame pair 22"), ["pair updated"]);
  assert.deepEqual(position(), [17, 22]);
  assert.deepEqual(await run("undo"), ["pair restored"]);
  assert.deepEqual(position(), [1, 2]);
  assert.deepEqual(await run("redo"), ["pair updated"]);
  assert.deepEqual(position(), [17, 22]);
});

test("P08 partial handler failures and conflicts preserve the pending redo", async () => {
  const { activate, run } = setup();
  activate((context) => context.registerAttribute(new PairAttribute()));
  await run("init");
  await run("create g frame");
  await run("create rect r 1 2 3 4 in frame");
  await run("set r x 99");
  const edited = await run("tree");
  await run("undo");
  const clean = await run("tree");
  await assert.rejects(run("set frame pair throw"), /attribute handler fixture-pair: failure after first write/);
  assert.deepEqual(await run("tree"), clean);
  await assert.rejects(run("set frame pair invalid"), /y must be a finite number/);
  assert.deepEqual(await run("tree"), clean);
  activate((context) => context.registerAttribute(new PairAttribute("competing-pair")));
  await assert.rejects(run("set frame pair 33"), /conflicting attribute handlers for frame.pair: fixture-pair, competing-pair/);
  assert.deepEqual(await run("tree"), clean);
  await run("redo");
  assert.deepEqual(await run("tree"), edited);
});

test("P09 plugin activation discards all staged registrations on failure or duplicate", async () => {
  const { activate, run } = setup();
  assert.throws(() => activate((context) => {
    context.registerCommand(new EchoCommand());
    context.registerAttribute(new PairAttribute());
    throw new Error("activation interrupted");
  }), /activation interrupted/);
  await assert.rejects(run("fixture-echo test"), /unknown command: fixture-echo/);
  assert.throws(() => activate((context) => {
    context.registerCommand(new EchoCommand());
    try { context.registerCommand(new EchoCommand()); } catch { /* The activation still fails. */ }
  }), /duplicate registration: commands\/fixture-echo/);
  await assert.rejects(run("fixture-echo test"), /unknown command: fixture-echo/);
  activate((context) => {
    context.registerCommand(new EchoCommand());
    context.registerAttribute(new PairAttribute());
  });
  assert.deepEqual(await run("fixture-echo test"), ["test"]);
});

test("P10 malformed decorator output reports its registration name and leaves other commands usable", async () => {
  const { activate, run } = setup();
  activate((context) => context.registerDecorator(new RowTag("broken-label", () => "two\nlines")));
  await run("init");
  await assert.rejects(run("tree"), /tree decorator broken-label: invalid tree label/);
  assert.deepEqual(await run("canvas"), ["canvas 800x600"]);
});
