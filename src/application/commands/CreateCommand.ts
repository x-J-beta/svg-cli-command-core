import type { Shape } from "../../domain/Shape.js";
import type { ShapeContainer } from "../../domain/ShapeContainer.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import { AddToCommand } from "./AddToCommand.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class CreateCommand implements ReversibleCommand {
  readonly #node: Shape;
  readonly #target: ShapeContainer | undefined;
  readonly #index: number | undefined;

  constructor(node: Shape, target?: ShapeContainer, index?: number) {
    this.#node = node;
    this.#target = target;
    this.#index = index;
  }

  execute(context: CommandContext): EditResult {
    const inverse = new AddToCommand(
      this.#node, context.document.temporaryForCommands(),
    );
    context.document.attachNew(this.#node, this.#target, this.#index);
    const parent = this.#target?.owner;
    return new EditResult(inverse, `${this.#node.label} created${parent ? ` in ${parent.label}` : ""}`, (rollbackContext) => {
      rollbackContext.document.discardUncommittedCreation(this.#node);
    });
  }

  retainedNodes(): ReadonlySet<Shape> {
    const nodes = new Set([this.#node]);
    if (this.#target?.owner) nodes.add(this.#target.owner);
    return nodes;
  }
}
