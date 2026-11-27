import type { Plugin, PluginContext } from "../../application/plugins/index.js";
import { BoxShapeProvider } from "./BoxShapeProvider.js";
import { BoxFillHandler } from "./BoxFillHandler.js";
import { BoxLabelHandler } from "./BoxLabelHandler.js";
import { BoxTypeDecorator } from "./BoxTypeDecorator.js";

export class BoxPlugin implements Plugin {
  activate(context: PluginContext, options?: unknown): void {
    let fill = "#4a90d9";
    if (options !== undefined) {
      if (!options || typeof options !== "object" || !("fill" in options) || typeof options.fill !== "string") {
        throw new Error("box options must provide a string fill");
      }
      fill = options.fill;
    }
    context.registerShape(new BoxShapeProvider(context.createShape, fill));
    context.registerAttribute(new BoxFillHandler());
    context.registerAttribute(new BoxLabelHandler());
    context.registerDecorator(new BoxTypeDecorator());
  }
}

export default new BoxPlugin();
