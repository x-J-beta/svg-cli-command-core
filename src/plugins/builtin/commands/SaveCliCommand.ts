import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class SaveCliCommand implements Command {
  readonly name = "save";
  readonly syntax = "save [file.svg]";
  execute(args: CommandArguments, session: CommandSession): Promise<readonly string[]> {
    args.requireCount(0, 1); return session.save(args.values[0]);
  }
}
