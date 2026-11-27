import type { TreeDecorator, TreeRow } from "../../application/plugins/index.js";

export class BoxTypeDecorator implements TreeDecorator {
  readonly name = "box-type-label";
  decorate(row: TreeRow): string | undefined { return row.shape?.type === "box" ? "(box)" : undefined; }
}
