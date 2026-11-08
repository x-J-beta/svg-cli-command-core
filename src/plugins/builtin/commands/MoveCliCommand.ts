import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { MoveCommand } from "../../../application/commands/MoveCommand.js";

export class MoveCliCommand implements Command {
  readonly name = "move";
  readonly syntax = "move <id> <dx> <dy>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(3);
    return session.edit(new MoveCommand(session.document.findActiveById(args.at(0)), args.number(1), args.number(2)));
  }
}
