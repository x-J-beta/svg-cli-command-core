import { Shape } from "./Shape.js";
import type { GeometryTarget } from "./GeometryTarget.js";
import type { CreationParameter, PropertyDefinition } from "./PropertyDefinition.js";

export abstract class GeometricShape extends Shape {
  protected abstract get geometryDefinitions(): readonly PropertyDefinition[];
  protected abstract get horizontalNames(): readonly string[];
  protected abstract get verticalNames(): readonly string[];

  override get propertyDefinitions(): readonly PropertyDefinition[] {
    return [...super.propertyDefinitions, ...this.geometryDefinitions];
  }

  override get creationParameters(): readonly CreationParameter[] {
    return [...this.geometryDefinitions.map(({ name }) => ({ name })), { name: "fill", optional: true }];
  }

  protected initializeGeometry(values: readonly number[]): void {
    this.geometryDefinitions.forEach((definition, index) => this.writeProperty(definition.name, values[index] ?? 0));
  }

  override moveTargets(dx: number, dy: number): readonly GeometryTarget[] {
    return [
      ...this.horizontalNames.map((name) => ({ shape: this, name, value: Number(this.readProperty(name)) + dx })),
      ...this.verticalNames.map((name) => ({ shape: this, name, value: Number(this.readProperty(name)) + dy })),
    ];
  }

  override scaleTargets(factor: number): readonly GeometryTarget[] {
    return this.geometryDefinitions.filter(({ type }) => type === "number").map(({ name }) => ({
      shape: this, name, value: Number(this.readProperty(name)) * factor,
    }));
  }
}
