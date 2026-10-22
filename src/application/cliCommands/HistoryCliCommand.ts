import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class HistoryCliCommand implements CliCommand {
  readonly name: string;
  readonly syntax: string;
  readonly #redo: boolean;
  constructor(name: string, redo: boolean) { this.name = name; this.syntax = name; this.#redo = redo; }
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(0); return this.#redo ? session.redo() : session.undo();
  }
}
