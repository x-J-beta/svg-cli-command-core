import type { Plugin, PluginContext } from "../../application/plugins/index.js";
import { StatsCommand } from "./StatsCommand.js";

export class StatsPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerCommand(new StatsCommand()); }
}

export default new StatsPlugin();
