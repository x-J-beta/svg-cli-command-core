import type { CliCommand } from "./CliCommand.js";
import type { CommandArguments } from "./CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";

export class CanvasCliCommand implements CliCommand {
  readonly name = "canvas";
  readonly syntax = "canvas [w h]";
  execute(args: CommandArguments, session: EditorSession): readonly string[] {
    if (args.count === 0) return session.canvas();
    args.requireCount(2); return session.canvas(args.number(0), args.number(1));
  }
}
