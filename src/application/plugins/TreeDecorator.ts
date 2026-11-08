import type { TreeRow } from "./TreeRow.js";

export interface TreeDecorator {
  readonly name: string;
  decorate(row: TreeRow): string | undefined;
}
