import type { Shape } from "../../domain/Shape.js";
import { Group } from "../../domain/Group.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";
import { CommandBatch } from "./CommandBatch.js";
import { CreateCommand } from "./CreateCommand.js";
import { AddToCommand } from "./AddToCommand.js";

export class GroupCommand implements ReversibleCommand {
  readonly #id: string;
  readonly #members: readonly string[];
  constructor(id: string, members: readonly string[]) { this.#id = id; this.#members = [...members]; }

  execute(context: CommandContext): EditResult {
    if (this.#members.length === 0) throw new Error("group requires at least one shape");
    const selected = new Set(this.#members.map((id) => context.document.findActiveById(id)));
    if (selected.size !== this.#members.length) throw new Error("cannot group the same shape more than once");
    for (const node of selected) {
      let ancestor = node.parent?.owner ?? null;
      while (ancestor) {
        if (selected.has(ancestor)) throw new Error(`cannot group a container into its own descendant: ${ancestor.id}`);
        ancestor = ancestor.parent?.owner ?? null;
      }
    }
    const ordered = context.document.visibleShapes().filter((shape) => selected.has(shape));
    const position = context.document.placementOf(ordered[0]!);
    const group = new Group(this.#id);
    return new CommandBatch([
      new CreateCommand(group, position.parent, position.index),
      ...ordered.map((node) => new AddToCommand(node, group.asContainer())),
    ], `${group.label} created with ${ordered.length} children`, `${group.label} grouping undone`).execute(context);
  }
  retainedNodes(): ReadonlySet<Shape> { return new Set(); }
}
