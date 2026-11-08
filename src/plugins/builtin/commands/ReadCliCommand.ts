import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class ReadCliCommand implements Command {
  readonly name = "read";
  readonly syntax = "read <file.svg>";
  execute(args: CommandArguments, session: CommandSession): Promise<readonly string[]> {
    args.requireCount(1); return session.read(args.at(0));
  }
}
