const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

test("SVG badges filter files, handle cancellation and release resources", async () => {
  let fileType = 1;
  let missing = false;
  let statCalls = 0;
  let disposed = 0;
  const disposable = { dispose() { disposed++; } };
  const vscode = {
    EventEmitter: class {
      event = () => disposable;
      fire() {}
      dispose() { disposed++; }
    },
    FileDecoration: class {
      constructor(badge, tooltip) { this.badge = badge; this.tooltip = tooltip; }
    },
    FileType: { File: 1, Directory: 2 },
    workspace: {
      createFileSystemWatcher() {
        return { onDidCreate: () => disposable, onDidDelete: () => disposable, dispose: () => disposed++ };
      },
      fs: { async stat() { statCalls++; if (missing) throw new Error("not found"); return { type: fileType }; } },
    },
  };
  const exports = {};
  runInNewContext(readFileSync(join(__dirname, "../dist/SvgFileDecorationProvider.js"), "utf8"), {
    exports,
    require(name) { assert.equal(name, "vscode"); return vscode; },
  });
  const provider = new exports.SvgFileDecorationProvider();
  const token = { isCancellationRequested: false };
  const badge = await provider.provideFileDecoration({ path: "/demo.svg" }, token);
  assert.equal(badge.badge, "[]");
  assert.equal(badge.propagate, false);
  assert.equal(await provider.provideFileDecoration({ path: "/demo.txt" }, token), undefined);
  assert.equal(statCalls, 1);
  fileType = 2;
  assert.equal(await provider.provideFileDecoration({ path: "/folder.svg" }, token), undefined);
  missing = true;
  assert.equal(await provider.provideFileDecoration({ path: "/missing.svg" }, token), undefined);
  const previousCalls = statCalls;
  assert.equal(await provider.provideFileDecoration({ path: "/cancelled.svg" }, { isCancellationRequested: true }), undefined);
  assert.equal(statCalls, previousCalls);
  provider.dispose();
  assert.equal(disposed, 4);
});
