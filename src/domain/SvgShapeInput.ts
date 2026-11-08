import type { Shape } from "./Shape.js";

export interface SvgShapeInput {
  readonly tag: string;
  readonly id: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly text: string;
  readonly hasChildren: boolean;
  readonly children: readonly Shape[];
}
