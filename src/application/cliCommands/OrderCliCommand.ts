import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { AddToCommand } from "../commands/AddToCommand.js";

export class OrderCliCommand implements CliCommand {
  readonly name: string;
  readonly syntax: string;
  readonly #toEnd: boolean;
  constructor(name: string, toEnd: boolean) { this.name = name; this.syntax = `${name} <id>`; this.#toEnd = toEnd; }
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(1);
    const shape = session.document.findActiveById(args.at(0));
    const parent = session.document.placementOf(shape).parent;
    return session.edit(new AddToCommand(shape, parent, this.#toEnd ? parent.size - 1 : 0));
  }
}
