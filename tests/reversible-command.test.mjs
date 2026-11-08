import test from "node:test";
import assert from "node:assert/strict";
import {
  AddToCommand, CommandBatch, CommandContext, CommandHistory, CreateCommand,
  DeleteCommand, Group, SetPropertyCommand, SvgDocument,
} from "svg-cli-command-core";
import { TestShape } from "./helpers/TestShape.mjs";

function fixture() {
  const document = new SvgDocument();
  const context = new CommandContext(document);
  const history = new CommandHistory();
  const group = new Group("g1");
  const a = new TestShape("a");
  const b = new TestShape("b");
  const c = new TestShape("c");
  document.attachNew(group);
  for (const node of [a, b, c]) document.attachNew(node, group.asContainer());
  return { document, context, history, group, a, b, c };
}

const ids = (container) => container.children.map((node) => node.id);

test("an AddTo execution and its inverse each generate a fresh inverse", () => {
  const { document, context, group, b } = fixture();
  const original = new AddToCommand(b, document.root, 0);
  const first = original.execute(context);
  assert.ok(first.inverse instanceof AddToCommand);
  assert.notEqual(first.inverse, original);
  assert.deepEqual(ids(document.root), ["b", "g1"]);
  const second = first.inverse.execute(context);
  assert.notEqual(second.inverse, first.inverse);
  assert.notEqual(second.inverse, original);
  assert.deepEqual(ids(group.asContainer()), ["a", "b", "c"]);
  second.inverse.execute(context);
  assert.equal(document.root.children[0], b);
});

test("deleting and restoring a group preserves the original subtree objects", () => {
  const { document, context, history, group, a, b } = fixture();
  history.executeNew(new DeleteCommand("g1"), context);
  assert.deepEqual(document.visibleShapes(), []);
  assert.throws(() => document.findActiveById("a"), /no such shape/);
  assert.throws(() => document.findActiveById("g1"), /no such shape/);
  assert.equal(document.temporaryForCommands().children[0], group);
  assert.equal(group.asContainer().children[0], a);
  history.undo(context);
  assert.equal(document.findActiveById("g1"), group);
  assert.equal(document.findActiveById("b"), b);
  assert.equal(history.redoCount, 1);
  history.redo(context);
  assert.equal(document.temporaryForCommands().children[0], group);
});

test("repeated undo and redo preserve identity and original insertion position", () => {
  const { context, history, group, b } = fixture();
  history.executeNew(new DeleteCommand("b"), context);
  for (let attempt = 0; attempt < 5; attempt++) {
    history.undo(context);
    assert.equal(group.asContainer().children[1], b);
    history.redo(context);
    assert.deepEqual(ids(group.asContainer()), ["a", "c"]);
  }
});

test("omitting index appends to the destination", () => {
  const { document, context, group, a } = fixture();
  new AddToCommand(a, document.root).execute(context);
  assert.deepEqual(ids(document.root), ["g1", "a"]);
  assert.deepEqual(ids(group.asContainer()), ["b", "c"]);
});

test("same-parent index is interpreted after removal; its inverse restores order", () => {
  const { context, group, a } = fixture();
  const result = new AddToCommand(a, group.asContainer(), 2).execute(context);
  assert.deepEqual(ids(group.asContainer()), ["b", "c", "a"]);
  result.inverse.execute(context);
  assert.deepEqual(ids(group.asContainer()), ["a", "b", "c"]);
});

test("invalid positions fail without changing order, parent or history", () => {
  const { context, history, group, a } = fixture();
  for (const index of [-1, 3, 1.5, NaN, Infinity]) {
    assert.throws(
      () => history.executeNew(new AddToCommand(a, group.asContainer(), index), context),
      /invalid insertion index/,
    );
    assert.deepEqual(ids(group.asContainer()), ["a", "b", "c"]);
    assert.equal(a.parent, group.asContainer());
    assert.equal(history.undoCount, 0);
  }
});

test("a container cannot be moved into itself or one of its descendants", () => {
  const { document, context, group } = fixture();
  const nested = new Group("nested");
  document.attachNew(nested, group.asContainer());
  for (const target of [group.asContainer(), nested.asContainer()]) {
    assert.throws(() => new AddToCommand(group, target).execute(context), /descendant/);
    assert.equal(group.parent, document.root);
    assert.equal(nested.parent, group.asContainer());
  }
});

test("moving between different documents is rejected without detaching the source", () => {
  const { context, group, a } = fixture();
  const other = new SvgDocument();
  assert.throws(() => new AddToCommand(a, other.root).execute(context), /another document/);
  assert.equal(a.parent, group.asContainer());
});

test("creation undo hides the new object and redo restores that same object", () => {
  const { document, context, history } = fixture();
  const node = new TestShape("new");
  const result = history.executeNew(new CreateCommand(node, document.root, 0), context);
  assert.ok(result.inverse instanceof AddToCommand);
  history.undo(context);
  assert.throws(() => document.findActiveById("new"), /no such shape/);
  history.redo(context);
  assert.equal(document.root.children[0], node);
});

test("a reused id restores the old and new objects according to history order", () => {
  const { document, context, history, a } = fixture();
  const replacement = new TestShape("a");
  history.executeNew(new DeleteCommand("a"), context);
  history.executeNew(new CreateCommand(replacement), context);
  assert.equal(document.findActiveById("a"), replacement);
  history.undo(context);
  history.undo(context);
  assert.equal(document.findActiveById("a"), a);
  history.redo(context);
  history.redo(context);
  assert.equal(document.findActiveById("a"), replacement);
});

test("a failed restore leaves the undo entry and hidden object available for retry", () => {
  const { document, context, history, a } = fixture();
  history.executeNew(new DeleteCommand("a"), context);
  const conflict = new TestShape("a");
  document.attachNew(conflict); // Simulate an out-of-band conflicting change.
  assert.throws(() => history.undo(context), /id already exists/);
  assert.equal(history.undoCount, 1);
  assert.equal(history.redoCount, 0);
  assert.ok(document.temporaryForCommands().children.includes(a));
  new DeleteCommand("a").execute(context);
  history.undo(context);
  assert.equal(document.findActiveById("a"), a);
});

test("the inverse of set removes an originally absent attribute", () => {
  const { context, a } = fixture();
  const first = new SetPropertyCommand(a, "fill", "red").execute(context);
  assert.equal(a.readProperty("fill"), "red");
  const second = first.inverse.execute(context);
  assert.equal(a.readProperty("fill"), undefined);
  assert.notEqual(second.inverse, first.inverse);
  second.inverse.execute(context);
  assert.equal(a.readProperty("fill"), "red");
});

test("a set inverse is generated from execution-time state", () => {
  const { context, a } = fixture();
  a.writeProperty("fill", "blue");
  const first = new SetPropertyCommand(a, "fill", "red").execute(context);
  a.writeProperty("fill", "green");
  const second = first.inverse.execute(context);
  assert.equal(a.readProperty("fill"), "blue");
  second.inverse.execute(context);
  assert.equal(a.readProperty("fill"), "green");
});

test("invalid properties and hidden objects cannot be edited", () => {
  const { document, context, history, a } = fixture();
  assert.throws(() => new SetPropertyCommand(a, "unknown", "x").execute(context), /unknown attribute/);
  assert.throws(() => new SetPropertyCommand(a, "stroke-width", -1).execute(context), /non-negative/);
  history.executeNew(new DeleteCommand("a"), context);
  assert.throws(() => new SetPropertyCommand(a, "fill", "red").execute(context), /not active/);
  assert.throws(() => document.findActiveById("a"), /no such shape/);
});

test("a batch becomes one history unit and reverses child command order", () => {
  const { document, context, history, group, a, b } = fixture();
  history.executeNew(new CommandBatch([
    new AddToCommand(a, document.root),
    new AddToCommand(b, document.root),
  ]), context);
  assert.equal(history.undoCount, 1);
  history.undo(context);
  assert.deepEqual(ids(group.asContainer()), ["a", "b", "c"]);
  history.redo(context);
  assert.deepEqual(ids(document.root), ["g1", "a", "b"]);
});

test("a failed batch rolls back prior property and hierarchy changes", () => {
  const { document, context, history, group, a } = fixture();
  assert.throws(() => history.executeNew(new CommandBatch([
    new SetPropertyCommand(a, "fill", "red"),
    new AddToCommand(a, document.root),
    new DeleteCommand("missing"),
  ]), context), /no such shape/);
  assert.equal(a.readProperty("fill"), undefined);
  assert.deepEqual(ids(group.asContainer()), ["a", "b", "c"]);
  assert.equal(document.temporaryForCommands().size, 0);
  assert.equal(history.undoCount, 0);
});

test("failed creation batches restore detached state without leaving hidden objects", () => {
  const { document, context, history } = fixture();
  const fresh = new TestShape("fresh");
  const batch = new CommandBatch([
    new CreateCommand(fresh), new DeleteCommand("missing"),
  ]);
  assert.throws(() => history.executeNew(batch, context), /no such shape/);
  assert.equal(fresh.parent, null);
  assert.equal(document.temporaryForCommands().size, 0);
  assert.throws(() => document.findActiveById("fresh"), /no such shape/);
});

test("nested batches preserve creation rollback behavior", () => {
  const { document, context } = fixture();
  const fresh = new TestShape("fresh");
  const batch = new CommandBatch([
    new CommandBatch([new CreateCommand(fresh), new SetPropertyCommand(fresh, "fill", "red")]),
    new DeleteCommand("missing"),
  ]);
  assert.throws(() => batch.execute(context), /no such shape/);
  assert.equal(fresh.parent, null);
  assert.equal(fresh.readProperty("fill"), undefined);
  assert.equal(document.temporaryForCommands().size, 0);
});

test("failed edits preserve redo; successful new edits clear it", () => {
  const { context, history, a, b } = fixture();
  history.executeNew(new SetPropertyCommand(a, "fill", "red"), context);
  history.undo(context);
  assert.throws(() => history.executeNew(new DeleteCommand("missing"), context));
  assert.equal(history.redoCount, 1);
  history.executeNew(new SetPropertyCommand(b, "fill", "blue"), context);
  assert.equal(history.redoCount, 0);
});

test("new edits collect abandoned redo objects without collecting needed undo objects", () => {
  const { document, context, history, a, b } = fixture();
  history.executeNew(new DeleteCommand("a"), context);
  const abandoned = new TestShape("abandoned");
  history.executeNew(new CreateCommand(abandoned), context);
  history.undo(context);
  history.executeNew(new SetPropertyCommand(b, "fill", "red"), context);
  assert.equal(abandoned.parent, null);
  assert.ok(document.temporaryForCommands().children.includes(a));
  history.undo(context);
  history.undo(context);
  assert.equal(document.findActiveById("a"), a);
});

test("hidden ancestors referenced by restore commands are retained", () => {
  const { document, context, history, group, a } = fixture();
  history.executeNew(new DeleteCommand("a"), context);
  history.executeNew(new DeleteCommand("g1"), context);
  history.undo(context);
  history.undo(context);
  assert.equal(a.parent, group.asContainer());
  assert.equal(document.findActiveById("a"), a);
});

test("history barriers release hidden objects and block undo/redo until a successful edit", () => {
  const { document, context, history, a, b } = fixture();
  history.executeNew(new DeleteCommand("a"), context);
  history.onIoSucceeded(context);
  assert.equal(a.parent, null);
  assert.equal(document.temporaryForCommands().size, 0);
  assert.throws(() => history.undo(context), /undo not allowed after io command/);
  assert.throws(() => history.redo(context), /undo not allowed after io command/);
  assert.throws(() => history.executeNew(new DeleteCommand("missing"), context));
  assert.throws(() => history.undo(context), /undo not allowed after io command/);
  history.executeNew(new SetPropertyCommand(b, "fill", "red"), context);
  history.undo(context);
  assert.equal(b.readProperty("fill"), undefined);
});

test("duplicate active ids are rejected and ordinary leaf shapes have no container", () => {
  const { document, context, history, a } = fixture();
  const duplicate = new TestShape("a");
  assert.equal(a.asContainer(), undefined);
  assert.throws(() => history.executeNew(new CreateCommand(duplicate), context), /id already exists/);
  assert.equal(duplicate.parent, null);
  assert.equal(document.findActiveById("a"), a);
});
