import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class TreeCliCommand implements Command {
  readonly name = "tree";
  readonly syntax = "tree [id]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(0, 1); return session.tree(args.values[0]);
  }
}
