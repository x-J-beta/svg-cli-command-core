import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";
import { CommandBatch } from "./CommandBatch.js";
import { SetPropertyCommand } from "./SetPropertyCommand.js";

export class ScaleCommand implements ReversibleCommand {
  readonly #node: Shape;
  readonly #factor: number;
  constructor(node: Shape, factor: number) { this.#node = node; this.#factor = factor; }

  execute(context: CommandContext): EditResult {
    context.document.requireActive(this.#node);
    if (!Number.isFinite(this.#factor) || this.#factor <= 0) throw new Error("scale factor must be positive");
    return new CommandBatch(
      this.#node.scaleTargets(this.#factor).map(({ shape, name, value }) => new SetPropertyCommand(shape, name, value)),
      `${this.#node.label} scaled by ${this.#factor}`, `${this.#node.label} scale undone`,
    ).execute(context);
  }
  retainedNodes(): ReadonlySet<Shape> { return new Set([this.#node]); }
}
