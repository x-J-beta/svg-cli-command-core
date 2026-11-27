import test from "node:test";
import assert from "node:assert/strict";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { ModifiedStarPlugin } from "../dist/plugins/modified-star/ModifiedStarPlugin.js";
import { ModifiedStarDecorator } from "../dist/plugins/modified-star/ModifiedStarDecorator.js";
import { BoxPlugin } from "../dist/plugins/box/BoxPlugin.js";
import { FixedSvgRepository } from "./helpers/FixedSvgRepository.mjs";
import { Tokenizer } from "../dist/cli/Tokenizer.js";

function editor() {
  const assembly = new CliAssembly();
  assembly.extensions.activate(new BoxPlugin());
  assembly.extensions.activate(new ModifiedStarPlugin());
  const session = assembly.createSession(new FixedSvgRepository(assembly.factory));
  const tokenizer = new Tokenizer();
  return { session, run: (line) => assembly.dispatcher.execute(tokenizer.tokenize(line), session) };
}

test("T01 modified-star is independently usable and composes after the box tag", async () => {
  const decorator = new ModifiedStarDecorator();
  assert.equal(decorator.decorate({ changedSinceBaseline: true }), "*");
  assert.equal(decorator.decorate({ changedSinceBaseline: false }), undefined);
  const { run } = editor();
  await run("init");
  await run("create box b 1 2 3 4 title");
  const tree = await run("tree");
  assert.equal(tree[0], "svg (800x600) *");
  assert.equal(tree[1], "└── g#b (box) *");
  assert.ok(tree[2].endsWith(" *"));
  assert.ok(tree[3].endsWith(" *"));
});

test("T02 edit-save-edit-undo follows the declared editing-history dirty semantics", async () => {
  const { run } = editor();
  await run("init"); await run("create box b 1 2 3 4 title");
  await run("save clean.svg");
  const clean = await run("tree");
  assert.ok(clean.every((line) => !line.endsWith(" *")));
  await run("set b label changed");
  const changed = await run("tree");
  assert.equal(changed[1], "└── g#b (box) *");
  assert.ok(!changed[2].endsWith(" *"));
  assert.ok(changed[3].endsWith(" *"));
  await run("undo");
  assert.deepEqual(await run("tree"), clean.map((line, index) => index === 2 ? line : line + " *"));
  await run("redo");
  assert.deepEqual(await run("tree"), changed);
  await assert.rejects(run("save readonly.svg"), /cannot write file/);
  assert.deepEqual(await run("tree"), changed);
  await run("read clean.svg");
  assert.deepEqual(await run("tree"), clean);
});

test("T03 sessions have independent modification state and failed edits do not dirty saved rows", async () => {
  const left = editor();
  const right = editor();
  for (const item of [left, right]) {
    await item.run("init"); await item.run("create rect r 1 2 3 4"); await item.run("save clean.svg");
  }
  const before = await right.run("tree");
  await left.run("set r x 9");
  await assert.rejects(right.run("set r width -1"), /non-negative/);
  assert.deepEqual(await right.run("tree"), before);
  assert.ok((await left.run("tree"))[1].endsWith(" *"));
});
