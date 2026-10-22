import type { PropertyValue } from "../../domain/PropertyValue.js";
import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class SetPropertyCommand implements ReversibleCommand {
  readonly #node: Shape;
  readonly #name: string;
  readonly #value: PropertyValue | undefined;

  constructor(node: Shape, name: string, value: PropertyValue | undefined) {
    this.#node = node;
    this.#name = name;
    this.#value = value;
  }

  execute(context: CommandContext): EditResult {
    context.document.requireActive(this.#node);
    const previous = this.#node.readProperty(this.#name);
    const inverse = new SetPropertyCommand(this.#node, this.#name, previous);
    this.#node.writeProperty(this.#name, this.#value);
    return new EditResult(inverse, `${this.#node.label} updated: ${this.#name}=${this.#value === undefined ? "(unset)" : JSON.stringify(this.#value)}`);
  }

  retainedNodes(): ReadonlySet<Shape> { return new Set([this.#node]); }
}
