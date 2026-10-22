import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { ScaleCommand } from "../commands/ScaleCommand.js";

export class ScaleCliCommand implements CliCommand {
  readonly name = "scale";
  readonly syntax = "scale <id> <factor>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(2);
    return session.edit(new ScaleCommand(session.document.findActiveById(args.at(0)), args.number(1)));
  }
}
