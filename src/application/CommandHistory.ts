import type { Shape } from "../domain/Shape.js";
import type { CommandContext } from "./CommandContext.js";
import type { EditResult } from "./EditResult.js";
import type { ReversibleCommand } from "./commands/ReversibleCommand.js";

export class CommandHistory {
  readonly #undo: ReversibleCommand[] = [];
  readonly #redo: ReversibleCommand[] = [];
  #blockedByIo = false;

  get undoCount(): number { return this.#undo.length; }
  get redoCount(): number { return this.#redo.length; }

  executeNew(command: ReversibleCommand, context: CommandContext): EditResult {
    const result = command.execute(context);
    this.#redo.length = 0;
    this.#undo.push(result.inverse);
    this.#blockedByIo = false;
    this.collectUnused(context);
    return result;
  }

  undo(context: CommandContext): EditResult {
    this.requireAllowed();
    return this.executePending(this.#undo, this.#redo, "undo", context);
  }

  redo(context: CommandContext): EditResult {
    this.requireAllowed();
    return this.executePending(this.#redo, this.#undo, "redo", context);
  }

  onIoSucceeded(context: CommandContext): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#blockedByIo = true;
    this.collectUnused(context);
  }

  private executePending(
    source: ReversibleCommand[], target: ReversibleCommand[],
    action: string, context: CommandContext,
  ): EditResult {
    const pending = source.at(-1);
    if (!pending) throw new Error(`nothing to ${action}`);
    const result = pending.execute(context);
    source.pop();
    target.push(result.inverse);
    this.collectUnused(context);
    return result;
  }

  private requireAllowed(): void {
    if (this.#blockedByIo) throw new Error("undo not allowed after io command");
  }

  private collectUnused(context: CommandContext): void {
    const retained = new Set<Shape>();
    for (const command of [...this.#undo, ...this.#redo]) {
      for (const node of command.retainedNodes()) retained.add(node);
    }
    context.document.releaseUnneededTemporaryRoots(retained);
  }
}
