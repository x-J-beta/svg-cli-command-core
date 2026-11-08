import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { DeleteCommand } from "../../../application/commands/DeleteCommand.js";

export class DeleteCliCommand implements Command {
  readonly name = "delete";
  readonly syntax = "delete <id>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(1); return session.edit(new DeleteCommand(args.at(0)));
  }
}
