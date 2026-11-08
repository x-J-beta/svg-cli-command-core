import { CommandArguments } from "./cliCommands/CommandArguments.js";
import type { CommandSession } from "./plugins/CommandSession.js";
import type { ExtensionRegistry } from "./plugins/ExtensionRegistry.js";

export class CommandDispatcher {
  readonly #registry: ExtensionRegistry;
  constructor(registry: ExtensionRegistry) { this.#registry = registry; }

  async execute(tokens: readonly string[], session: CommandSession): Promise<readonly string[]> {
    const name = tokens[0];
    if (name === undefined) return [];
    const command = this.#registry.command(name);
    if (!command) throw new Error(`unknown command: ${name}`);
    const output = await command.execute(new CommandArguments(tokens.slice(1), command.syntax), session);
    if (!Array.isArray(output) || output.some((line) => typeof line !== "string")) {
      throw new Error(`invalid command output: ${name}`);
    }
    return output;
  }
}
