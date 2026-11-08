import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { UngroupCommand } from "../../../application/commands/UngroupCommand.js";

export class UngroupCliCommand implements Command {
  readonly name = "ungroup";
  readonly syntax = "ungroup <gid>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(1); return session.edit(new UngroupCommand(args.at(0)));
  }
}
