import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";

export class HelpCliCommand implements Command {
  readonly name = "help";
  readonly syntax = "help";
  readonly #describe: () => readonly string[];
  constructor(describe: () => readonly string[]) { this.#describe = describe; }
  execute(args: CommandArguments): readonly string[] { args.requireCount(0); return this.#describe(); }
}
