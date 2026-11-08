import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { GroupCommand } from "../../../application/commands/GroupCommand.js";

export class GroupCliCommand implements Command {
  readonly name = "group";
  readonly syntax = "group <newGid> <id1> [id2...]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(2, Infinity);
    return session.edit(new GroupCommand(args.at(0), args.values.slice(1), (id) => session.factory.create("g", id)));
  }
}
