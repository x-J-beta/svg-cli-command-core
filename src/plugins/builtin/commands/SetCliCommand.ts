import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class SetCliCommand implements Command {
  readonly name = "set";
  readonly syntax = "set <id> <attr> <value>";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(3);
    return session.setAttribute(args.at(0), args.at(1), args.at(2));
  }
}
