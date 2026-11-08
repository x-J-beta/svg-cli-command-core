import type { CommandArguments } from "../cliCommands/CommandArguments.js";
import type { CommandSession } from "./CommandSession.js";

export interface Command {
  readonly name: string;
  readonly syntax: string;
  execute(args: CommandArguments, session: CommandSession): readonly string[] | Promise<readonly string[]>;
}
