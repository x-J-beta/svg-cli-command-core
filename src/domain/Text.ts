import { GeometricShape } from "./GeometricShape.js";
import type { CreationParameter, PropertyDefinition } from "./PropertyDefinition.js";

export class Text extends GeometricShape {
  constructor(id: string, x = 0, y = 0, content = "") {
    super(id); this.initializeGeometry([x, y]); this.writeProperty("text", content);
  }
  override get tagName(): string { return "text"; }
  protected get horizontalNames(): readonly string[] { return ["x"]; }
  protected get verticalNames(): readonly string[] { return ["y"]; }
  protected get geometryDefinitions(): readonly PropertyDefinition[] {
    return [{ name: "x", type: "number" }, { name: "y", type: "number" }];
  }
  override get propertyDefinitions(): readonly PropertyDefinition[] {
    return [...super.propertyDefinitions, { name: "text", type: "string" }];
  }
  override get creationParameters(): readonly CreationParameter[] { return [{ name: "x" }, { name: "y" }, { name: "text" }]; }
  override get textContent(): string { return String(this.readProperty("text") ?? ""); }
  override get summary(): string {
    return `(${this.readProperty("x")},${this.readProperty("y")}) ${JSON.stringify(this.textContent)}` +
      (this.readProperty("fill") !== undefined ? ` fill=${this.readProperty("fill")}` : "");
  }
}
