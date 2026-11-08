import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";
import { CreateCommand } from "../../../application/commands/CreateCommand.js";

export class CreateCliCommand implements Command {
  readonly name = "create";
  readonly syntax = "create <type> <id> [params...] [in <containerId>]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(2, Infinity);
    const values = [...args.values.slice(2)];
    let target = session.document.root;
    if (values.length >= 2 && values.at(-2) === "in") {
      target = session.container(values.at(-1)!); values.splice(-2);
    }
    const shape = session.factory.fromArguments(args.at(0), args.at(1), values);
    return session.edit(new CreateCommand(shape, target));
  }
}
