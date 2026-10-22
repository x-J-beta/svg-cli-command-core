import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";
import { CommandBatch } from "./CommandBatch.js";
import { AddToCommand } from "./AddToCommand.js";

export class UngroupCommand implements ReversibleCommand {
  readonly #id: string;
  constructor(id: string) { this.#id = id; }

  execute(context: CommandContext): EditResult {
    const group = context.document.findActiveById(this.#id);
    const container = group.asContainer();
    if (!container) throw new Error(`not a container: ${this.#id}`);
    const position = context.document.placementOf(group);
    if (position.parent === context.document.root) throw new Error(`cannot ungroup top-level container: ${this.#id}`);
    return new CommandBatch([
      ...container.children.map((node, index) => new AddToCommand(node, position.parent, position.index + index)),
      new AddToCommand(group, context.document.temporaryForCommands()),
    ], `${group.label} ungrouped`, `${group.label} restored`).execute(context);
  }
  retainedNodes(): ReadonlySet<Shape> { return new Set(); }
}
