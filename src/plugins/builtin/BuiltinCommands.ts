import type { Plugin } from "../../application/plugins/Plugin.js";
import type { PluginContext } from "../../application/plugins/PluginContext.js";
import { InitCliCommand } from "./commands/InitCliCommand.js";
import { ReadCliCommand } from "./commands/ReadCliCommand.js";
import { SaveCliCommand } from "./commands/SaveCliCommand.js";
import { CanvasCliCommand } from "./commands/CanvasCliCommand.js";
import { CreateCliCommand } from "./commands/CreateCliCommand.js";
import { DeleteCliCommand } from "./commands/DeleteCliCommand.js";
import { SetCliCommand } from "./commands/SetCliCommand.js";
import { AddToCliCommand } from "./commands/AddToCliCommand.js";
import { MoveCliCommand } from "./commands/MoveCliCommand.js";
import { ScaleCliCommand } from "./commands/ScaleCliCommand.js";
import { GroupCliCommand } from "./commands/GroupCliCommand.js";
import { UngroupCliCommand } from "./commands/UngroupCliCommand.js";
import { OrderCliCommand } from "./commands/OrderCliCommand.js";
import { TreeCliCommand } from "./commands/TreeCliCommand.js";
import { ShowCliCommand } from "./commands/ShowCliCommand.js";
import { HistoryCliCommand } from "./commands/HistoryCliCommand.js";
import { HelpCliCommand } from "./commands/HelpCliCommand.js";
import { ExitCliCommand } from "./commands/ExitCliCommand.js";

export class BuiltinCommands implements Plugin {
  readonly #describe: () => readonly string[];
  constructor(describe: () => readonly string[]) { this.#describe = describe; }

  activate(context: PluginContext): void {
    for (const command of [
      new InitCliCommand(), new ReadCliCommand(), new SaveCliCommand(), new CanvasCliCommand(),
      new CreateCliCommand(), new DeleteCliCommand(), new MoveCliCommand(), new ScaleCliCommand(),
      new SetCliCommand(), new GroupCliCommand(), new UngroupCliCommand(), new AddToCliCommand(),
      new OrderCliCommand("front", true), new OrderCliCommand("back", false),
      new TreeCliCommand(), new ShowCliCommand(), new HistoryCliCommand("undo", false), new HistoryCliCommand("redo", true),
      new HelpCliCommand(this.#describe), new ExitCliCommand(),
    ]) context.registerCommand(command);
  }
}
