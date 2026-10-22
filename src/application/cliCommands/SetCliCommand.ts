import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { SetPropertyCommand } from "../commands/SetPropertyCommand.js";

export class SetCliCommand implements CliCommand {
  readonly name = "set";
  readonly syntax = "set <id> <attr> <value>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(3);
    const shape = session.document.findActiveById(args.at(0));
    return session.edit(new SetPropertyCommand(shape, args.at(1), session.factory.parseProperty(shape, args.at(1), args.at(2))));
  }
}
