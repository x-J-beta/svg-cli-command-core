import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { MoveCommand } from "../commands/MoveCommand.js";

export class MoveCliCommand implements CliCommand {
  readonly name = "move";
  readonly syntax = "move <id> <dx> <dy>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(3);
    return session.edit(new MoveCommand(session.document.findActiveById(args.at(0)), args.number(1), args.number(2)));
  }
}
