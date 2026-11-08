import type { Shape } from "./Shape.js";
import type { SvgShapeInput } from "./SvgShapeInput.js";

export interface ShapeProvider {
  readonly name: string;
  /** Opt in to restoring data-kind="<name>" on this SVG tag. */
  readonly svgTag?: string;
  createEmpty?(id: string): Shape;
  create(id: string, values: readonly string[]): Shape;
  fromSvg(input: SvgShapeInput): Shape;
}
