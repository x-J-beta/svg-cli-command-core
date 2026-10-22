import type { EditorSession } from "./EditorSession.js";
import type { CliCommand } from "./cliCommands/CliCommand.js";
import { CommandArguments } from "./cliCommands/CommandArguments.js";
import { InitCliCommand } from "./cliCommands/InitCliCommand.js";
import { ReadCliCommand } from "./cliCommands/ReadCliCommand.js";
import { SaveCliCommand } from "./cliCommands/SaveCliCommand.js";
import { CanvasCliCommand } from "./cliCommands/CanvasCliCommand.js";
import { CreateCliCommand } from "./cliCommands/CreateCliCommand.js";
import { DeleteCliCommand } from "./cliCommands/DeleteCliCommand.js";
import { SetCliCommand } from "./cliCommands/SetCliCommand.js";
import { AddToCliCommand } from "./cliCommands/AddToCliCommand.js";
import { MoveCliCommand } from "./cliCommands/MoveCliCommand.js";
import { ScaleCliCommand } from "./cliCommands/ScaleCliCommand.js";
import { GroupCliCommand } from "./cliCommands/GroupCliCommand.js";
import { UngroupCliCommand } from "./cliCommands/UngroupCliCommand.js";
import { OrderCliCommand } from "./cliCommands/OrderCliCommand.js";
import { TreeCliCommand } from "./cliCommands/TreeCliCommand.js";
import { ShowCliCommand } from "./cliCommands/ShowCliCommand.js";
import { HistoryCliCommand } from "./cliCommands/HistoryCliCommand.js";
import { HelpCliCommand } from "./cliCommands/HelpCliCommand.js";
import { ExitCliCommand } from "./cliCommands/ExitCliCommand.js";

/** The only command-name dispatch point. Future work: command registration. */
export class CommandDispatcher {
  readonly #commands: ReadonlyMap<string, CliCommand>;
  constructor() {
    const commands: CliCommand[] = [
      new InitCliCommand(), new ReadCliCommand(), new SaveCliCommand(), new CanvasCliCommand(),
      new CreateCliCommand(), new DeleteCliCommand(), new MoveCliCommand(), new ScaleCliCommand(),
      new SetCliCommand(), new GroupCliCommand(), new UngroupCliCommand(), new AddToCliCommand(),
      new OrderCliCommand("front", true), new OrderCliCommand("back", false),
      new TreeCliCommand(), new ShowCliCommand(), new HistoryCliCommand("undo", false), new HistoryCliCommand("redo", true),
      new HelpCliCommand(() => [...this.#commands.values()].map((command) => command.syntax)), new ExitCliCommand(),
    ];
    this.#commands = new Map(commands.map((command) => [command.name, command]));
  }

  async execute(tokens: readonly string[], session: EditorSession): Promise<readonly string[]> {
    const name = tokens[0];
    if (name === undefined) return [];
    const command = this.#commands.get(name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command.execute(new CommandArguments(tokens.slice(1), command.syntax), session);
  }
}
