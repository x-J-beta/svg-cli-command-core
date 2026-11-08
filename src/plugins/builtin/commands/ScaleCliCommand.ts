import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { ScaleCommand } from "../../../application/commands/ScaleCommand.js";

export class ScaleCliCommand implements Command {
  readonly name = "scale";
  readonly syntax = "scale <id> <factor>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(2);
    return session.edit(new ScaleCommand(session.document.findActiveById(args.at(0)), args.number(1)));
  }
}
