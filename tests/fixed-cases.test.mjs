import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FixedCaseRunner } from "./helpers/FixedCaseRunner.mjs";
import { Tokenizer } from "../dist/cli/Tokenizer.js";

const suite = JSON.parse(readFileSync(new URL("./fixtures/fixed-command-cases.json", import.meta.url), "utf8"));

for (const scenario of suite.cases) {
  test(`fixed ${scenario.id}: ${scenario.title}`, async () => new FixedCaseRunner(suite.files).run(scenario));
}
for (const scenario of suite.invalidCases) {
  test(`fixed ${scenario.id}: reject ${scenario.command}`, async () => new FixedCaseRunner(suite.files).run(scenario, suite.invalidSetup));
}

test("fixed cases execute every target command through a successful scenario", () => {
  const tokenizer = new Tokenizer();
  const covered = new Set();
  for (const scenario of suite.cases) {
    for (const line of scenario.setup ?? []) covered.add(tokenizer.tokenize(line)[0]);
    for (const step of scenario.steps) if (step.error === undefined) covered.add(tokenizer.tokenize(step.command)[0]);
  }
  for (const command of suite.targetCommands) assert.ok(covered.has(command), `missing fixed coverage: ${command}`);
  const ids = [...suite.cases, ...suite.invalidCases].map((scenario) => scenario.id);
  assert.equal(new Set(ids).size, ids.length, "fixed case IDs must be unique");
});
