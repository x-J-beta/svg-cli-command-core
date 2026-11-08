import type { Command } from "../../../application/plugins/Command.js";
import type { CommandArguments } from "../../../application/cliCommands/CommandArguments.js";
import type { CommandSession } from "../../../application/plugins/CommandSession.js";

export class CanvasCliCommand implements Command {
  readonly name = "canvas";
  readonly syntax = "canvas [w h]";
  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    if (args.count === 0) return session.canvas();
    args.requireCount(2); return session.canvas(args.number(0), args.number(1));
  }
}
