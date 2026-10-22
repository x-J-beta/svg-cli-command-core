import type { Writable } from "node:stream";

export class ConsolePresenter {
  readonly #output: Writable;
  readonly #errors: Writable;
  constructor(output: Writable, errors: Writable) { this.#output = output; this.#errors = errors; }
  write(lines: readonly string[]): void { for (const line of lines) this.#output.write(line + "\n"); }
  error(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.#errors.write(`error: ${message.replace(/[\r\n]+/gu, " ")}\n`);
  }
}
