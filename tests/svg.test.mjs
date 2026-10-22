import test from "node:test";
import assert from "node:assert/strict";
import { SvgReader } from "../dist/infrastructure/svg/SvgReader.js";
import { SvgWriter } from "../dist/infrastructure/svg/SvgWriter.js";
import { SvgDocument, ShapeFactory, CommandContext, DeleteCommand } from "../dist/application/commands/index.js";

test("missing ids skip all explicit ids, including ids on elements later in the file", () => {
  const result = new SvgReader().parse('<svg width="400" height="300"><rect/><rect id="rect1"/><g><circle/></g></svg>');
  assert.deepEqual(result.document.visibleShapes().map((node) => node.id), ["rect2", "rect1", "g1", "circle1"]);
  assert.deepEqual(result.warnings, [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id circle1 to unnamed <circle>",
  ]);
});

test("duplicate ids, malformed XML, unsupported tags and invalid geometry are rejected", () => {
  for (const xml of [
    '<svg><rect id="r"/><circle id="r"/></svg>', '<svg><rect></svg>',
    '<svg><path id="p"/></svg>', '<svg><circle id="c" r="-1"/></svg>',
    '<svg><rect id="r" width="NaN"/></svg>', '<svg><rect id="r"><circle/></rect></svg>',
    '<svg><g id="g">unexpected</g></svg>', '<!DOCTYPE svg [<!ENTITY a "x">]><svg/>',
  ]) assert.throws(() => new SvgReader().parse(xml));
});

test("text children, character entities, CDATA and extra SVG attributes survive round trip", () => {
  const xml = '<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="200px"><g id="g" transform="translate(60,40)"><text id="t" x="1" y="2" font-size="16" text-anchor="middle">A &amp; B <![CDATA[<你好>]]></text></g></svg>';
  const first = new SvgReader().parse(xml).document;
  const second = new SvgReader().parse(new SvgWriter().serialize(first)).document;
  assert.equal(second.findActiveById("t").textContent, "A & B <你好>");
  assert.equal(second.findActiveById("g").svgAttributes().get("transform"), "translate(60,40)");
  assert.equal(second.findActiveById("t").svgAttributes().get("font-size"), "16");
  assert.equal(second.width, 400);
});

test("prefixed SVG namespaces are accepted; foreign namespaces are rejected", () => {
  const xml = '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:rect id="r"/></s:svg>';
  const document = new SvgReader().parse(xml).document;
  assert.equal(new SvgReader().parse(new SvgWriter().serialize(document)).document.findActiveById("r").tagName, "rect");
  assert.throws(() => new SvgReader().parse('<svg xmlns="urn:other"/>'), /namespace/);
});

test("viewBox dimensions provide defaults and remain unchanged until resizing", () => {
  const document = new SvgReader().parse('<svg viewBox="10 20 400 200"/>').document;
  assert.equal(document.width, 400); assert.equal(document.height, 200);
  assert.equal(document.viewBox, "10 20 400 200");
  document.resize(80, 60); assert.equal(document.viewBox, "0 0 80 60");
  assert.throws(() => new SvgReader().parse('<svg viewBox="0 0 2"/>'), /viewBox/);
});

test("default fill/stroke are omitted; hidden roots and descendants never serialize", () => {
  const factory = new ShapeFactory();
  const document = new SvgDocument();
  const group = factory.create("g", "g");
  document.attachNew(group);
  document.attachNew(factory.fromArguments("rect", "r", ["1", "2", "3", "4"]), group.asContainer());
  const context = new CommandContext(document);
  const writer = new SvgWriter();
  assert.ok(!writer.serialize(document).includes("fill="));
  const deleted = new DeleteCommand("g").execute(context);
  assert.ok(!writer.serialize(document).includes('id="r"'));
  assert.ok(!writer.serialize(document).includes('id="g"'));
  deleted.inverse.execute(context);
  assert.ok(writer.serialize(document).includes('id="r"'));
});

test("unknown box metadata falls back to an ordinary g", () => {
  const document = new SvgReader().parse('<svg><g id="box" data-kind="box"><rect id="box-rect"/></g></svg>').document;
  assert.equal(document.findActiveById("box").tagName, "g");
  assert.equal(document.findActiveById("box").asContainer().size, 1);
});

test("attribute newlines and text carriage returns are escaped without data loss", () => {
  const factory = new ShapeFactory();
  const document = new SvgDocument();
  const text = factory.fromArguments("text", "t", ["0", "0", 'quote " & \r\n\t世界']);
  text.retainSvgAttribute("data-note", "a\nb\tc\r");
  document.attachNew(text);
  const result = new SvgReader().parse(new SvgWriter().serialize(document)).document.findActiveById("t");
  assert.equal(result.textContent, text.textContent);
  assert.equal(result.svgAttributes().get("data-note"), "a\nb\tc\r");
});
