import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";
import { CommandBatch } from "./CommandBatch.js";
import { SetPropertyCommand } from "./SetPropertyCommand.js";

export class MoveCommand implements ReversibleCommand {
  readonly #node: Shape;
  readonly #dx: number;
  readonly #dy: number;
  constructor(node: Shape, dx: number, dy: number) { this.#node = node; this.#dx = dx; this.#dy = dy; }

  execute(context: CommandContext): EditResult {
    context.document.requireActive(this.#node);
    if (!Number.isFinite(this.#dx) || !Number.isFinite(this.#dy)) throw new Error("move offsets must be finite numbers");
    return new CommandBatch(
      this.#node.moveTargets(this.#dx, this.#dy).map(({ shape, name, value }) => new SetPropertyCommand(shape, name, value)),
      `${this.#node.label} moved by (${this.#dx},${this.#dy})`, `${this.#node.label} move undone`,
    ).execute(context);
  }
  retainedNodes(): ReadonlySet<Shape> { return new Set([this.#node]); }
}
