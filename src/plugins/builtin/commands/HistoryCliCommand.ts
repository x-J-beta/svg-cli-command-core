import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class HistoryCliCommand implements Command {
  readonly name: string;
  readonly syntax: string;
  readonly #redo: boolean;
  constructor(name: string, redo: boolean) { this.name = name; this.syntax = name; this.#redo = redo; }
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(0); return this.#redo ? session.redo() : session.undo();
  }
}
