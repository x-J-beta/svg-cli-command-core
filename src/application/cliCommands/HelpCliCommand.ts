import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";

export class HelpCliCommand implements CliCommand {
  readonly name = "help";
  readonly syntax = "help";
  readonly #describe: () => readonly string[];
  constructor(describe: () => readonly string[]) { this.#describe = describe; }
  execute(args: CommandArguments): readonly string[] { args.requireCount(0); return this.#describe(); }
}
