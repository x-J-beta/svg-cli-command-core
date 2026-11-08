import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class CommandBatch implements ReversibleCommand {
  readonly #commands: readonly ReversibleCommand[];
  readonly #feedback: string;
  readonly #inverseFeedback: string;

  constructor(commands: readonly ReversibleCommand[], feedback = "batch completed", inverseFeedback = "batch reverted") {
    this.#commands = [...commands];
    this.#feedback = feedback;
    this.#inverseFeedback = inverseFeedback;
  }

  execute(context: CommandContext): EditResult {
    const applied: EditResult[] = [];
    try {
      for (const command of this.#commands) {
        applied.push(command.execute(context));
      }
    } catch (failure) {
      // Each child is atomic; prior children are rolled back in reverse order.
      for (const result of [...applied].reverse()) result.rollback(context);
      throw failure;
    }
    const reversed = [...applied].reverse();
    return new EditResult(
      new CommandBatch(reversed.map((result) => result.inverse), this.#inverseFeedback, this.#feedback),
      this.#feedback,
      (rollbackContext) => {
        for (const result of reversed) result.rollback(rollbackContext);
      },
      applied.flatMap((result) => result.changedIds),
    );
  }

  retainedNodes(): ReadonlySet<Shape> {
    const nodes = new Set<Shape>();
    for (const command of this.#commands) {
      for (const node of command.retainedNodes()) nodes.add(node);
    }
    return nodes;
  }
}
