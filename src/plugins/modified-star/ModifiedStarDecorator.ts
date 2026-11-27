import type { TreeDecorator, TreeRow } from "../../application/plugins/index.js";

export class ModifiedStarDecorator implements TreeDecorator {
  readonly name = "modified-star";
  decorate(row: TreeRow): string | undefined { return row.changedSinceBaseline ? "*" : undefined; }
}
