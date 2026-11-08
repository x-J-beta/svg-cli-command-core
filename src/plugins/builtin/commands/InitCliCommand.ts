import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class InitCliCommand implements Command {
  readonly name = "init";
  readonly syntax = "init [w] [h]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(0, 2);
    return session.initialize(args.count > 0 ? args.number(0) : 800, args.count > 1 ? args.number(1) : 600);
  }
}
