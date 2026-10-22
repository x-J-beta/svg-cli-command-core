import type { Shape } from "./Shape.js";
import { Rect } from "./Rect.js";
import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Line } from "./Line.js";
import { Text } from "./Text.js";
import { Group } from "./Group.js";
import type { PropertyValue } from "./PropertyValue.js";

/** The only shape-name dispatch point. Future work: registered ShapeProviders. */
export class ShapeFactory {
  readonly #constructors = new Map<string, (id: string) => Shape>([
    ["rect", (id) => new Rect(id)], ["circle", (id) => new Circle(id)],
    ["ellipse", (id) => new Ellipse(id)], ["line", (id) => new Line(id)],
    ["text", (id) => new Text(id)], ["g", (id) => new Group(id)],
  ]);

  create(type: string, id: string): Shape {
    const constructor = this.#constructors.get(type);
    if (!constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return constructor(id);
  }

  fromArguments(type: string, id: string, values: readonly string[]): Shape {
    const shape = this.create(type, id);
    const parameters = shape.creationParameters;
    if (values.length < parameters.filter((item) => !item.optional).length || values.length > parameters.length) {
      throw new Error(`invalid parameters for ${type}`);
    }
    values.forEach((value, index) => {
      const parameter = parameters[index]!;
      shape.writeProperty(parameter.name, this.parseProperty(shape, parameter.name, value));
    });
    return shape;
  }

  parseProperty(shape: Shape, name: string, raw: string): PropertyValue {
    const definition = shape.propertyDefinitions.find((item) => item.name === name);
    if (!definition) throw new Error(`unknown attribute: ${name}`);
    if (definition.type === "string") return raw;
    const value = raw.trim() === "" ? NaN : Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
    return value;
  }

  fromSvg(type: string, id: string, attributes: ReadonlyMap<string, string>, content: string): Shape {
    const shape = this.create(type, id);
    for (const [name, value] of attributes) {
      if (name === "id") continue;
      if (shape.propertyDefinitions.some((definition) => definition.name === name)) {
        shape.writeProperty(name, this.parseProperty(shape, name, value));
      } else shape.retainSvgAttribute(name, value);
    }
    if (shape.textContent !== undefined) shape.writeProperty("text", content);
    return shape;
  }
}
