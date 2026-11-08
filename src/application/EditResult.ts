import type { ReversibleCommand } from "./commands/ReversibleCommand.js";
import type { CommandContext } from "./CommandContext.js";

export class EditResult {
  readonly inverse: ReversibleCommand;
  readonly feedback: string;
  readonly changedIds: readonly string[];
  readonly #rollback: (context: CommandContext) => void;

  constructor(
    inverse: ReversibleCommand, feedback: string,
    rollback?: (context: CommandContext) => void, changedIds: readonly string[] = [],
  ) {
    this.inverse = inverse;
    this.feedback = feedback;
    this.changedIds = changedIds;
    this.#rollback = rollback ?? ((context) => { inverse.execute(context); });
  }

  /** Reverts an uncommitted transaction, including newly created objects. */
  rollback(context: CommandContext): void { this.#rollback(context); }
}
