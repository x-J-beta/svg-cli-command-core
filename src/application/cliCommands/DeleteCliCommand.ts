import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { DeleteCommand } from "../commands/DeleteCommand.js";

export class DeleteCliCommand implements CliCommand {
  readonly name = "delete";
  readonly syntax = "delete <id>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(1); return session.edit(new DeleteCommand(args.at(0)));
  }
}
