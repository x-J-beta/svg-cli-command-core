import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class ExitCliCommand implements Command {
  readonly name = "exit";
  readonly syntax = "exit";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(0); session.requestExit(); return [];
  }
}
