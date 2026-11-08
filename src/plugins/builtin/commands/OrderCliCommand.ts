import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { AddToCommand } from "../../../application/commands/AddToCommand.js";

export class OrderCliCommand implements Command {
  readonly name: string;
  readonly syntax: string;
  readonly #toEnd: boolean;
  constructor(name: string, toEnd: boolean) { this.name = name; this.syntax = `${name} <id>`; this.#toEnd = toEnd; }
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(1);
    const shape = session.document.findActiveById(args.at(0));
    const parent = session.document.placementOf(shape).parent;
    return session.edit(new AddToCommand(shape, parent, this.#toEnd ? parent.size - 1 : 0));
  }
}
