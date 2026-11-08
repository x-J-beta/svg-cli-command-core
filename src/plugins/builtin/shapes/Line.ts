import { GeometricShape } from "../../../domain/GeometricShape.js";
import type { CreationParameter, PropertyDefinition } from "../../../domain/PropertyDefinition.js";

export class Line extends GeometricShape {
  constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) { super(id); this.initializeGeometry([x1, y1, x2, y2]); }
  override get tagName(): string { return "line"; }
  protected get horizontalNames(): readonly string[] { return ["x1", "x2"]; }
  protected get verticalNames(): readonly string[] { return ["y1", "y2"]; }
  protected get geometryDefinitions(): readonly PropertyDefinition[] {
    return ["x1", "y1", "x2", "y2"].map((name) => ({ name, type: "number" }));
  }
  override get creationParameters(): readonly CreationParameter[] {
    return [...this.geometryDefinitions.map(({ name }) => ({ name })), { name: "stroke", optional: true }];
  }
}
