import type { ShapeContainer } from "./ShapeContainer.js";

export interface Placement {
  readonly parent: ShapeContainer;
  readonly index: number;
}
