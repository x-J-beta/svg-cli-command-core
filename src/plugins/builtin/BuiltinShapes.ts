import { Circle } from "./shapes/Circle.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { Group } from "./shapes/Group.js";
import { Line } from "./shapes/Line.js";
import { Rect } from "./shapes/Rect.js";
import { Text } from "./shapes/Text.js";
import type { Plugin } from "../../application/plugins/Plugin.js";
import type { PluginContext } from "../../application/plugins/PluginContext.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class BuiltinShapes implements Plugin {
  activate(context: PluginContext): void {
    context.registerShape(new BuiltinShapeProvider("rect", Rect));
    context.registerShape(new BuiltinShapeProvider("circle", Circle));
    context.registerShape(new BuiltinShapeProvider("ellipse", Ellipse));
    context.registerShape(new BuiltinShapeProvider("line", Line));
    context.registerShape(new BuiltinShapeProvider("text", Text));
    context.registerShape(new BuiltinShapeProvider("g", Group));
  }
}
