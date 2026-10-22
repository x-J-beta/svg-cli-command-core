import { GeometricShape } from "./GeometricShape.js";
import type { PropertyDefinition } from "./PropertyDefinition.js";

export class Circle extends GeometricShape {
  constructor(id: string, cx = 0, cy = 0, r = 0) { super(id); this.initializeGeometry([cx, cy, r]); }
  override get tagName(): string { return "circle"; }
  protected get horizontalNames(): readonly string[] { return ["cx"]; }
  protected get verticalNames(): readonly string[] { return ["cy"]; }
  protected get geometryDefinitions(): readonly PropertyDefinition[] {
    return [{ name: "cx", type: "number" }, { name: "cy", type: "number" }, { name: "r", type: "number", minimum: 0 }];
  }
}
