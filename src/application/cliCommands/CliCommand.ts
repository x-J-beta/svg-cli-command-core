import type { EditorSession } from "../EditorSession.js";
import type { CommandArguments } from "./CommandArguments.js";

export interface CliCommand {
  readonly name: string;
  readonly syntax: string;
  execute(args: CommandArguments, session: EditorSession): readonly string[] | Promise<readonly string[]>;
}
