import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class ShowCliCommand implements CliCommand {
  readonly name = "show";
  readonly syntax = "show <id>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(1); return session.show(args.at(0));
  }
}
