import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { UngroupCommand } from "../commands/UngroupCommand.js";

export class UngroupCliCommand implements CliCommand {
  readonly name = "ungroup";
  readonly syntax = "ungroup <gid>";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    args.requireCount(1); return session.edit(new UngroupCommand(args.at(0)));
  }
}
