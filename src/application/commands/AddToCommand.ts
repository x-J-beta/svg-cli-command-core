import type { Shape } from "../../domain/Shape.js";
import type { ShapeContainer } from "../../domain/ShapeContainer.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class AddToCommand implements ReversibleCommand {
  readonly #node: Shape;
  readonly #target: ShapeContainer;
  readonly #index: number | undefined;

  constructor(node: Shape, target: ShapeContainer, index?: number) {
    this.#node = node;
    this.#target = target;
    this.#index = index;
  }

  execute(context: CommandContext): EditResult {
    const original = context.document.placementOf(this.#node);
    const inverse = new AddToCommand(this.#node, original.parent, original.index);
    context.document.relocate(this.#node, this.#target, this.#index);
    return new EditResult(inverse, this.#target === context.document.temporaryForCommands()
      ? `${this.#node.label} deleted`
      : `${this.#node.label} moved into ${this.#target.owner?.label ?? "svg"} at ${this.#target.indexOf(this.#node)}`);
  }

  retainedNodes(): ReadonlySet<Shape> {
    const nodes = new Set([this.#node]);
    if (this.#target.owner) nodes.add(this.#target.owner);
    return nodes;
  }
}
