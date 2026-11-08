import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { AddToCommand } from "../../../application/commands/AddToCommand.js";

export class AddToCliCommand implements Command {
  readonly name = "addto";
  readonly syntax = "addto <gid> <id> [index]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(2, 3);
    const target = session.container(args.at(0));
    return session.edit(new AddToCommand(session.document.findActiveById(args.at(1)), target, args.count === 3 ? args.number(2) : undefined));
  }
}
