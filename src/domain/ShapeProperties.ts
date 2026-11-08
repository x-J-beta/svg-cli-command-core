import type { PropertyValue } from "./PropertyValue.js";
import type { Shape } from "./Shape.js";

export class ShapeProperties {
  static parse(shape: Shape, name: string, raw: string): PropertyValue {
    const definition = shape.propertyDefinitions.find((item) => item.name === name);
    if (!definition) throw new Error(`unknown attribute: ${name}`);
    if (definition.type === "string") return raw;
    const value = raw.trim() === "" ? NaN : Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
    return value;
  }
}
