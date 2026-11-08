import type { ShapeView } from "./ShapeView.js";

export interface TreeRow {
  readonly shape: ShapeView | undefined;
  readonly text: string;
  readonly changedSinceBaseline: boolean;
}
