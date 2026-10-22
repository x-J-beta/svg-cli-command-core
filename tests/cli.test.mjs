import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Tokenizer } from "../dist/cli/Tokenizer.js";

test("tokenizer handles full-line comments, colors, spaces, empty strings and Windows paths", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize("   # comment"), []);
  assert.deepEqual(tokenizer.tokenize('create text t 1 2 "a b"'), ["create", "text", "t", "1", "2", "a b"]);
  assert.deepEqual(tokenizer.tokenize('set t text ""'), ["set", "t", "text", ""]);
  assert.deepEqual(tokenizer.tokenize('set r fill #4a90d9'), ["set", "r", "fill", "#4a90d9"]);
  assert.deepEqual(tokenizer.tokenize('read "D:\\drawings\\my diagram.svg"'), ["read", "D:\\drawings\\my diagram.svg"]);
  assert.deepEqual(tokenizer.tokenize('set t text "say \\"hello\\""'), ["set", "t", "text", 'say "hello"']);
  assert.throws(() => tokenizer.tokenize('set t text "missing'), /unterminated/);
});

test("real CLI consumes a script, reports one-line errors and continues to exit", () => {
  const result = spawnSync(process.execPath, ["dist/main.js"], {
    input: ['tree', 'init 400 200', 'create text t 10 20 "Hello 世界"', 'set t unknown 1', 'show t', 'exit', 'create g after-exit', ''].join("\n"),
    encoding: "utf8",
    cwd: process.cwd(),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes("canvas 400x200 created"));
  assert.ok(result.stdout.includes('text="Hello 世界"'));
  assert.ok(!result.stdout.includes("after-exit"));
  assert.deepEqual(result.stderr.trim().split(/\r?\n/u), [
    "error: no document. use 'init' or 'read' first", "error: unknown attribute: unknown",
  ]);
});
