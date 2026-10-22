import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class InitCliCommand implements CliCommand {
  readonly name = "init";
  readonly syntax = "init [w] [h]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(0, 2);
    return session.initialize(args.count > 0 ? args.number(0) : 800, args.count > 1 ? args.number(1) : 600);
  }
}
