import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import { AddToCommand } from "./AddToCommand.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";

export class DeleteCommand implements ReversibleCommand {
  readonly #id: string;

  constructor(id: string) { this.#id = id; }

  execute(context: CommandContext): EditResult {
    const node = context.document.findActiveById(this.#id);
    const result = new AddToCommand(
      node, context.document.temporaryForCommands(),
    ).execute(context);
    return new EditResult(result.inverse, `${node.label} deleted`);
  }

  retainedNodes(): ReadonlySet<Shape> { return new Set(); }
}
