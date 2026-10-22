import type { Shape } from "./Shape.js";

export interface GeometryTarget {
  readonly shape: Shape;
  readonly name: string;
  readonly value: number;
}
