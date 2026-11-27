import type { Command, CommandArguments, CommandSession, ShapeView } from "../../application/plugins/index.js";

export class StatsCommand implements Command {
  readonly name = "stats";
  readonly syntax = "stats";

  execute(args: CommandArguments, session: CommandSession): readonly string[] {
    args.requireCount(0);
    const counts = new Map<string, number>();
    let containers = 0;
    const visit = (shape: ShapeView): void => {
      if (shape.isContainer) { containers++; for (const child of shape.children) visit(child); }
      else counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1);
    };
    for (const shape of session.rootShapes) visit(shape);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    return [[...counts].map(([type, count]) => `${type}: ${count}`)
      .concat(`(total ${total}, containers ${containers})`).join("  ")];
  }
}
