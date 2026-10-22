import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class ExitCliCommand implements CliCommand {
  readonly name = "exit";
  readonly syntax = "exit";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(0); session.requestExit(); return [];
  }
}
