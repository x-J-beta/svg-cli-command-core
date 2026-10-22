import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class ReadCliCommand implements CliCommand {
  readonly name = "read";
  readonly syntax = "read <file.svg>";
  execute(args: CommandArguments, session: EditorSession): Promise<readonly string[]> {
    args.requireCount(1); return session.read(args.at(0));
  }
}
