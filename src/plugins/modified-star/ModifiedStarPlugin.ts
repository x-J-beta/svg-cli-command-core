import type { Plugin, PluginContext } from "../../application/plugins/index.js";
import { ModifiedStarDecorator } from "./ModifiedStarDecorator.js";

export class ModifiedStarPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerDecorator(new ModifiedStarDecorator()); }
}

export default new ModifiedStarPlugin();
