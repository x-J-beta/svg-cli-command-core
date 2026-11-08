import test from "node:test";
import assert from "node:assert/strict";
import {
  SvgDocument, CommandContext, CommandHistory, Rect, Group,
  MoveCommand, ScaleCommand, DeleteCommand, CommandBatch,
} from "svg-cli-command-core";
import { SvgReader } from "../dist/infrastructure/svg/SvgReader.js";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { WriteRecordingRect } from "./helpers/WriteRecordingRect.mjs";

function attach(shape) {
  const document = new SvgDocument();
  document.attachNew(shape);
  return { document, context: new CommandContext(document), history: new CommandHistory() };
}

test("G01 move rejects a later coordinate overflow before writing the first coordinate", () => {
  const rectangle = new WriteRecordingRect("r", 1, Number.MAX_VALUE, 3, 4);
  const { context, history } = attach(rectangle);
  assert.throws(() => history.executeNew(new MoveCommand(rectangle, 1, Number.MAX_VALUE), context), /geometry result must be finite: rect#r.y/);
  assert.equal(rectangle.writeCount, 0);
  assert.equal(rectangle.readProperty("x"), 1);
  assert.equal(rectangle.readProperty("y"), Number.MAX_VALUE);
  assert.equal(history.undoCount, 0);
});

test("G02 scale rejects a later dimension overflow before any property write", () => {
  const rectangle = new WriteRecordingRect("r", 1, 2, Number.MAX_VALUE, 4);
  const { context, history } = attach(rectangle);
  assert.throws(() => history.executeNew(new ScaleCommand(rectangle, 2), context), /geometry result must be finite: rect#r.width/);
  assert.equal(rectangle.writeCount, 0);
  assert.equal(rectangle.readProperty("x"), 1);
  assert.equal(rectangle.readProperty("width"), Number.MAX_VALUE);
  assert.equal(history.undoCount, 0);
});

test("G03 direct non-finite offsets fail without mutation or history changes", () => {
  const rectangle = new WriteRecordingRect("r", 1, 2, 3, 4);
  const { context, history } = attach(rectangle);
  assert.throws(() => history.executeNew(new MoveCommand(rectangle, NaN, 0), context), /finite/);
  assert.throws(() => history.executeNew(new MoveCommand(rectangle, 0, Infinity), context), /finite/);
  assert.throws(() => history.executeNew(new MoveCommand(rectangle, -Infinity, 1), context), /finite/);
  assert.equal(rectangle.writeCount, 0);
  assert.equal(history.undoCount, 0);
});

test("G04 invalid direct scale factors are rejected even for empty groups", () => {
  const group = new Group("empty");
  const { context, history } = attach(group);
  assert.throws(() => history.executeNew(new ScaleCommand(group, 0), context), /must be positive/);
  assert.throws(() => history.executeNew(new ScaleCommand(group, -1), context), /must be positive/);
  assert.throws(() => history.executeNew(new ScaleCommand(group, NaN), context), /must be positive/);
  assert.throws(() => history.executeNew(new ScaleCommand(group, Infinity), context), /must be positive/);
  assert.throws(() => history.executeNew(new MoveCommand(group, NaN, 0), context), /finite/);
  assert.equal(history.undoCount, 0);
});

test("G05 undo restores precise original coordinates after a displacement loses low bits", () => {
  const rectangle = new Rect("r", 0.1, -0.2, 0.3, 0.4);
  const { context, history } = attach(rectangle);
  const moved = history.executeNew(new MoveCommand(rectangle, 1e100, 1e100), context);
  assert.equal(rectangle.readProperty("x"), 1e100);
  assert.ok(moved.inverse instanceof CommandBatch);
  const undone = history.undo(context);
  assert.equal(rectangle.readProperty("x"), 0.1);
  assert.equal(rectangle.readProperty("y"), -0.2);
  assert.notEqual(undone.inverse, moved.inverse);
  const redone = history.redo(context);
  assert.equal(rectangle.readProperty("x"), 1e100);
  assert.notEqual(redone.inverse, undone.inverse);
  history.undo(context);
  assert.equal(rectangle.readProperty("x"), 0.1);
  assert.equal(rectangle.readProperty("width"), 0.3);
});

test("G06 undo restores exact dimensions even when a tiny positive scale underflows", () => {
  const rectangle = new Rect("r", 0.1, 0.2, 0.3, 0.4);
  const { context, history } = attach(rectangle);
  history.executeNew(new ScaleCommand(rectangle, Number.MIN_VALUE), context);
  assert.equal(rectangle.readProperty("width"), 0);
  history.undo(context);
  assert.equal(rectangle.readProperty("x"), 0.1);
  assert.equal(rectangle.readProperty("width"), 0.3);
  history.redo(context);
  assert.equal(rectangle.readProperty("width"), 0);
  history.undo(context);
  assert.equal(rectangle.readProperty("height"), 0.4);
});

test("G07 empty groups and identity operations each form one undo unit", () => {
  const group = new Group("empty");
  const { context, history } = attach(group);
  history.executeNew(new MoveCommand(group, 0, 0), context);
  assert.equal(history.undoCount, 1);
  history.executeNew(new ScaleCommand(group, 1), context);
  assert.equal(history.undoCount, 2);
  history.undo(context); history.undo(context);
  assert.equal(history.undoCount, 0); assert.equal(history.redoCount, 2);
  history.executeNew(new MoveCommand(group, 0, 0), context);
  assert.equal(history.redoCount, 0);
});

test("G08 hidden, detached and foreign shapes cannot be moved or scaled", () => {
  const rectangle = new Rect("r", 1, 2, 3, 4);
  const { context, history } = attach(rectangle);
  history.executeNew(new DeleteCommand("r"), context);
  assert.throws(() => history.executeNew(new MoveCommand(rectangle, 1, 2), context), /not active/);
  assert.throws(() => history.executeNew(new ScaleCommand(rectangle, 2), context), /not active/);
  assert.equal(history.undoCount, 1);
  const detached = new Rect("detached");
  assert.throws(() => new MoveCommand(detached, 1, 2).execute(context), /not active/);
  const foreign = new Rect("foreign");
  attach(foreign);
  assert.throws(() => new ScaleCommand(foreign, 2).execute(context), /not active/);
  history.undo(context);
  assert.equal(rectangle.readProperty("x"), 1);
});

test("G09 imported transform, font size, text and stroke width stay unchanged", () => {
  const document = new SvgReader(new CliAssembly().factory).parse('<svg><g id="g" transform="translate(10,20) scale(3)"><rect id="r" x="1" y="2" width="3" height="4" stroke-width="2"/><text id="t" x="5" y="6" font-size="18">Hello 世界</text></g></svg>').document;
  const context = new CommandContext(document);
  const history = new CommandHistory();
  const group = document.findActiveById("g");
  history.executeNew(new MoveCommand(group, 2, 3), context);
  history.executeNew(new ScaleCommand(group, 2), context);
  assert.equal(document.findActiveById("r").readProperty("x"), 6);
  assert.equal(document.findActiveById("r").readProperty("height"), 8);
  assert.equal(document.findActiveById("t").readProperty("y"), 18);
  assert.equal(document.findActiveById("r").readProperty("stroke-width"), 2);
  assert.equal(document.findActiveById("t").svgAttributes().get("font-size"), "18");
  assert.equal(document.findActiveById("t").textContent, "Hello 世界");
  assert.equal(group.svgAttributes().get("transform"), "translate(10,20) scale(3)");
  history.undo(context); history.undo(context);
  assert.equal(document.findActiveById("r").readProperty("x"), 1);
});

test("G10 failed overflow preserves an existing redo entry", () => {
  const rectangle = new Rect("r", 1, 2, Number.MAX_VALUE, 4);
  const { context, history } = attach(rectangle);
  history.executeNew(new MoveCommand(rectangle, 3, 4), context);
  history.undo(context);
  assert.throws(() => history.executeNew(new ScaleCommand(rectangle, 2), context), /finite/);
  assert.equal(history.undoCount, 0); assert.equal(history.redoCount, 1);
  history.redo(context);
  assert.equal(rectangle.readProperty("x"), 4);
  assert.equal(rectangle.readProperty("y"), 6);
});
