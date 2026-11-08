import assert from "node:assert/strict";
import { CliAssembly } from "../../dist/host/CliAssembly.js";
import { Tokenizer } from "../../dist/cli/Tokenizer.js";
import { FixedSvgRepository } from "./FixedSvgRepository.mjs";

export class FixedCaseRunner {
  #repository;
  #session;
  #dispatcher;
  #tokenizer = new Tokenizer();
  constructor(files) {
    const assembly = new CliAssembly();
    this.#repository = new FixedSvgRepository(assembly.factory, files);
    this.#session = assembly.createSession(this.#repository);
    this.#dispatcher = assembly.dispatcher;
  }

  async run(testCase, defaultSetup = []) {
    for (const line of testCase.setup ?? defaultSetup) await this.execute(line);
    for (const step of testCase.steps ?? [{ command: testCase.command, error: testCase.error }]) {
      const context = `${testCase.id}: ${step.command}`;
      if (step.error !== undefined) {
        // Assertion-only observations, never used to restore editor state.
        const before = this.observe();
        await assert.rejects(this.execute(step.command), (error) => {
          assert.ok(error.message.includes(step.error), `${context}: ${error.message}`);
          return true;
        });
        assert.deepEqual(this.observe(), before, `${context}: failed command changed state`);
      } else {
        const output = (await this.execute(step.command)).join("\n");
        for (const part of step.output ?? []) assert.ok(output.includes(part), `${context}: missing output ${part}`);
      }
      if (step.canvas) assert.deepEqual([this.#session.document.width, this.#session.document.height], step.canvas, context);
      for (const [id, properties] of Object.entries(step.properties ?? {})) {
        const node = this.#session.document.findActiveById(id);
        for (const [name, expected] of Object.entries(properties)) {
          assert.equal(node.readProperty(name), expected, `${context}: ${id}.${name}`);
        }
      }
      for (const id of step.absent ?? []) assert.throws(() => this.#session.document.findActiveById(id), /no such shape/, context);
      for (const [id, children] of Object.entries(step.children ?? {})) {
        const container = id === "$root" ? this.#session.document.root : this.#session.document.findActiveById(id).asContainer();
        assert.deepEqual(container.children.map((node) => node.id), children, `${context}: children ${id}`);
      }
      if (step.saved) {
        const xml = this.#repository.content(step.saved.path);
        assert.equal(typeof xml, "string", context);
        for (const value of step.saved.includes ?? []) assert.ok(xml.includes(value), `${context}: saved XML missing ${value}`);
        for (const value of step.saved.excludes ?? []) assert.ok(!xml.includes(value), `${context}: saved XML contains ${value}`);
      }
      if (step.exit !== undefined) assert.equal(this.#session.exitRequested, step.exit, context);
    }
  }

  async execute(line) { return this.#dispatcher.execute(this.#tokenizer.tokenize(line), this.#session); }

  observe() {
    let document;
    try { document = this.#session.document; } catch { return { document: undefined }; }
    return {
      document,
      canvas: [document.width, document.height, document.viewBox],
      nodes: document.visibleShapes().map((node) => ({
        node, parent: node.parent, index: node.parent.indexOf(node),
        attributes: [...node.svgAttributes()], text: node.textContent,
      })),
      hidden: document.temporaryForCommands().children,
    };
  }
}
