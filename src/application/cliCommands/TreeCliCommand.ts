import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class TreeCliCommand implements CliCommand {
  readonly name = "tree";
  readonly syntax = "tree [id]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(0, 1); return session.tree(args.values[0]);
  }
}
