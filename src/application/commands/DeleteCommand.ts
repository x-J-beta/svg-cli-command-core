import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";
import { AddToCommand } from "./AddToCommand.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class DeleteCommand implements ReversibleCommand {
  readonly #id: string;

  constructor(id: string) { this.#id = id; }

  execute(context: CommandContext): EditResult {
    const node = context.document.findActiveById(this.#id);
    return new AddToCommand(
      node, context.document.temporaryForCommands(),
    ).execute(context);
  }

  retainedNodes(): ReadonlySet<Shape> { return new Set(); }
}
