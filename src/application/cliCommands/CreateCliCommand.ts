import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { CreateCommand } from "../commands/CreateCommand.js";

export class CreateCliCommand implements CliCommand {
  readonly name = "create";
  readonly syntax = "create <type> <id> [params...] [in <containerId>]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
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
