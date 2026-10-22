import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { CommandDispatcher } from "../application/CommandDispatcher.js";
import type { EditorSession } from "../application/EditorSession.js";
import { Tokenizer } from "./Tokenizer.js";
import { ConsolePresenter } from "./ConsolePresenter.js";

export class CliRepl {
  readonly #dispatcher: CommandDispatcher;
  readonly #session: EditorSession;
  readonly #tokenizer = new Tokenizer();
  constructor(dispatcher: CommandDispatcher, session: EditorSession) { this.#dispatcher = dispatcher; this.#session = session; }

  async run(input: Readable = process.stdin, output: Writable = process.stdout, errors: Writable = process.stderr): Promise<void> {
    const interactive = Boolean((input as NodeJS.ReadStream).isTTY);
    const presenter = new ConsolePresenter(output, errors);
    const lines = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    presenter.write(["svg-editor 0.1 — type 'help' for commands"]);
    if (interactive) { lines.setPrompt("svg> "); lines.prompt(); }
    try {
      for await (const line of lines) {
        try { presenter.write(await this.#dispatcher.execute(this.#tokenizer.tokenize(line), this.#session)); }
        catch (error) { presenter.error(error); }
        if (this.#session.exitRequested) break;
        if (interactive) lines.prompt();
      }
    } finally { lines.close(); }
  }
}
