import { GeometricShape } from "./GeometricShape.js";
import type { PropertyDefinition } from "./PropertyDefinition.js";

export class Ellipse extends GeometricShape {
  constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0) { super(id); this.initializeGeometry([cx, cy, rx, ry]); }
  override get tagName(): string { return "ellipse"; }
  protected get horizontalNames(): readonly string[] { return ["cx"]; }
  protected get verticalNames(): readonly string[] { return ["cy"]; }
  protected get geometryDefinitions(): readonly PropertyDefinition[] {
    return [
      { name: "cx", type: "number" }, { name: "cy", type: "number" },
      { name: "rx", type: "number", minimum: 0 }, { name: "ry", type: "number", minimum: 0 },
    ];
  }
}
