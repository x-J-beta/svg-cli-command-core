import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { AddToCommand } from "../commands/AddToCommand.js";

export class AddToCliCommand implements CliCommand {
  readonly name = "addto";
  readonly syntax = "addto <gid> <id> [index]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(2, 3);
    const target = session.container(args.at(0));
    return session.edit(new AddToCommand(session.document.findActiveById(args.at(1)), target, args.count === 3 ? args.number(2) : undefined));
  }
}
