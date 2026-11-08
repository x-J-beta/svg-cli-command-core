import type { ShapeProvider } from "../../domain/ShapeProvider.js";
import type { Shape } from "../../domain/Shape.js";
import type { AttributeHandler } from "./AttributeHandler.js";
import type { Command } from "./Command.js";
import type { TreeDecorator } from "./TreeDecorator.js";

export interface PluginContext {
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerDecorator(decorator: TreeDecorator): void;
  registerAttribute(handler: AttributeHandler): void;
  /** Construct a detached shape using a provider that is already published. */
  createShape(type: string, id: string, args: readonly string[]): Shape;
}
