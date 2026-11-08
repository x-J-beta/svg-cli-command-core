import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class ShowCliCommand implements Command {
  readonly name = "show";
  readonly syntax = "show <id>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(1); return session.show(args.at(0));
  }
}
