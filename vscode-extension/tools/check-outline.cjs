const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const { SvgOutlineParser } = require("../dist/SvgOutlineParser.js");

function provider() {
  const exports = {};
  const filename = join(__dirname, "../dist/SvgDocumentSymbolProvider.js");
  const localRequire = createRequire(filename);
  const vscode = {
    SymbolKind: { Module: 1, Object: 18 },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    DocumentSymbol: class {
      constructor(name, detail, kind, range, selectionRange) {
        Object.assign(this, { name, detail, kind, range, selectionRange, children: [] });
      }
    },
  };
  runInNewContext(readFileSync(filename, "utf8"), {
    exports, require: (name) => name === "vscode" ? vscode : localRequire(name),
  });
  return new exports.SvgDocumentSymbolProvider();
}

function document(source) {
  return {
    getText: () => source,
    positionAt(offset) {
      const lines = source.slice(0, offset).split(/\r\n|\r|\n/u);
      return { line: lines.length - 1, character: lines.at(-1).length };
    },
  };
}

test("O01 parses root, nested groups, leaves without ids and arbitrary SVG elements", () => {
  const root = new SvgOutlineParser().parse('<svg><g id="outer"><g><path id="p" d="M0 0"/></g><text>Hello</text></g></svg>');
  assert.equal(root.name, "svg");
  assert.equal(root.children[0].name, "g#outer");
  assert.equal(root.children[0].children[0].name, "g");
  assert.equal(root.children[0].children[0].children[0].name, "path#p");
  assert.equal(root.children[0].children[1].name, "text");
});

test("O02 element and selection offsets preserve quotes, comments, CDATA and Unicode", () => {
  const source = '<?xml version="1.0"?>\r\n<svg>\r\n<!-- <fake/> -->\r\n<text>😀<![CDATA[<fake/>]]></text><rect id="中文😀" data-note="a>b"/>\r\n</svg>';
  const root = new SvgOutlineParser().parse(source);
  const rect = root.children[1];
  assert.equal(source.slice(root.start, root.end), source.slice(source.indexOf("<svg>")));
  assert.equal(source.slice(rect.start, rect.end), '<rect id="中文😀" data-note="a>b"/>');
  assert.equal(source.slice(rect.nameStart, rect.nameEnd), "rect");
  assert.equal(rect.name, "rect#中文😀");
  assert.equal(root.children.length, 2);
});

test("O03 qualified tag names and entity-decoded ids retain source spelling and order", () => {
  const source = '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:g id="a&amp;b"><s:text>test</s:text></s:g></s:svg>';
  const root = new SvgOutlineParser().parse(source);
  assert.equal(root.name, "s:svg");
  assert.equal(root.children[0].name, "s:g#a&b");
  const child = root.children[0].children[0];
  assert.equal(source.slice(child.nameStart, child.nameEnd), "s:text");
});

test("O04 rejects malformed XML, non-SVG roots and document types", () => {
  for (const source of ["", "<svg>", "<svg><g></svg>", '<svg><rect id="x></svg>', "<html/>",
    '<svg xmlns="urn:other"/>', '<!DOCTYPE svg [<!ENTITY item "test">]><svg/>']) {
    assert.throws(() => new SvgOutlineParser().parse(source), undefined, source);
  }
});

test("O05 document symbols map CRLF and emoji offsets to exact source lines and columns", () => {
  const source = '<svg>\r\n  <text>😀</text><rect id="start"/>\r\n</svg>';
  const root = provider().provideDocumentSymbols(document(source), { isCancellationRequested: false })[0];
  const rect = root.children[1];
  assert.equal(rect.name, "rect#start");
  assert.equal(JSON.stringify(rect.selectionRange), JSON.stringify({
    start: { line: 1, character: 18 }, end: { line: 1, character: 22 },
  }));
  assert.equal(root.range.end.line, 2);
  assert.equal(root.range.end.character, 6);
});

test("O06 reparses current edit buffers, clears incomplete XML and recovers after repair", () => {
  const symbols = provider();
  let source = '<svg><rect id="before"/></svg>';
  const buffer = { getText: () => source, positionAt: (offset) => ({ line: 0, character: offset }) };
  const token = { isCancellationRequested: false };
  assert.equal(symbols.provideDocumentSymbols(buffer, token)[0].children[0].name, "rect#before");
  source = '<svg><circle id="after"/></svg>';
  assert.equal(symbols.provideDocumentSymbols(buffer, token)[0].children[0].name, "circle#after");
  source = '<svg><circle id="after"/>';
  assert.equal(symbols.provideDocumentSymbols(buffer, token).length, 0);
  source += '</svg>';
  assert.equal(symbols.provideDocumentSymbols(buffer, token)[0].children[0].name, "circle#after");
});

test("O07 cancellation returns an empty outline without reading the document", () => {
  const buffer = { getText() { assert.fail("Cancelled request read the buffer"); } };
  assert.equal(provider().provideDocumentSymbols(buffer, { isCancellationRequested: true }).length, 0);
});

test("O08 node accessors protect the children collection", () => {
  const root = new SvgOutlineParser().parse('<svg><g/></svg>');
  const children = root.children;
  children.length = 0;
  assert.equal(root.children.length, 1);
});
