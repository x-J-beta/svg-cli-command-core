import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class SaveCliCommand implements CliCommand {
  readonly name = "save";
  readonly syntax = "save [file.svg]";
  execute(args: CommandArguments, session: EditorSession): Promise<readonly string[]> {
    args.requireCount(0, 1); return session.save(args.values[0]);
  }
}
