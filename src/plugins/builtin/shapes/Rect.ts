import { GeometricShape } from "../../../domain/GeometricShape.js";
import type { PropertyDefinition } from "../../../domain/PropertyDefinition.js";

export class Rect extends GeometricShape {
  constructor(id: string, x = 0, y = 0, width = 0, height = 0) {
    super(id); this.initializeGeometry([x, y, width, height]);
  }
  override get tagName(): string { return "rect"; }
  protected get horizontalNames(): readonly string[] { return ["x"]; }
  protected get verticalNames(): readonly string[] { return ["y"]; }
  protected get geometryDefinitions(): readonly PropertyDefinition[] {
    return [
      { name: "x", type: "number" }, { name: "y", type: "number" },
      { name: "width", type: "number", minimum: 0 }, { name: "height", type: "number", minimum: 0 },
    ];
  }
  override get summary(): string {
    return super.summary.replace(/\bwidth=/u, "w=").replace(/\bheight=/u, "h=");
  }
}
