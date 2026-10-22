import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { GroupCommand } from "../commands/GroupCommand.js";

export class GroupCliCommand implements CliCommand {
  readonly name = "group";
  readonly syntax = "group <newGid> <id1> [id2...]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(2, Infinity); return session.edit(new GroupCommand(args.at(0), args.values.slice(1)));
  }
}
