import type { Plugin, PluginContext } from "../../application/plugins/index.js";
import type { DirectoryAccess } from "./DirectoryAccess.js";
import { NodeDirectoryAdapter } from "./NodeDirectoryAdapter.js";
import { DirCommand } from "./DirCommand.js";

export class DirPlugin implements Plugin {
  readonly #directory: DirectoryAccess;
  constructor(directory: DirectoryAccess = new NodeDirectoryAdapter()) { this.#directory = directory; }
  activate(context: PluginContext): void { context.registerCommand(new DirCommand(this.#directory)); }
}

export default new DirPlugin();
