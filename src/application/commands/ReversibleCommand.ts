import type { Shape } from "../../domain/Shape.js";
import type { CommandContext } from "../CommandContext.js";
import type { EditResult } from "../EditResult.js";

export interface ReversibleCommand {
  /** Executes atomically and returns a newly generated inverse command. */
  execute(context: CommandContext): EditResult;
  retainedNodes(): ReadonlySet<Shape>;
}
