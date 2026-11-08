import type { Shape } from "../../domain/Shape.js";
import type { ShapeProvider } from "../../domain/ShapeProvider.js";
import type { SvgShapeInput } from "../../domain/SvgShapeInput.js";
import { ShapeProperties } from "../../domain/ShapeProperties.js";

export class BuiltinShapeProvider implements ShapeProvider {
  readonly name: string;
  readonly #ShapeClass: new (id: string) => Shape;
  constructor(name: string, shapeClass: new (id: string) => Shape) {
    this.name = name;
    this.#ShapeClass = shapeClass;
  }

  createEmpty(id: string): Shape { return new this.#ShapeClass(id); }

  create(id: string, values: readonly string[]): Shape {
    const shape = this.createEmpty(id);
    const parameters = shape.creationParameters;
    if (values.length < parameters.filter((item) => !item.optional).length || values.length > parameters.length) {
      throw new Error(`invalid parameters for ${this.name}`);
    }
    values.forEach((value, index) => {
      const name = parameters[index]!.name;
      shape.writeProperty(name, ShapeProperties.parse(shape, name, value));
    });
    return shape;
  }

  fromSvg(input: SvgShapeInput): Shape {
    const shape = this.createEmpty(input.id);
    if (shape.tagName !== input.tag) throw new Error(`invalid SVG tag for ${this.name}: ${input.tag}`);
    for (const [name, value] of input.attributes) {
      if (name === "id") continue;
      if (shape.propertyDefinitions.some((definition) => definition.name === name)) {
        shape.writeProperty(name, ShapeProperties.parse(shape, name, value));
      } else shape.retainSvgAttribute(name, value);
    }
    if (shape.textContent !== undefined) shape.writeProperty("text", input.text);
    else if (input.text.trim() !== "") throw new Error(`unexpected text inside <${input.tag}>`);
    const container = shape.asContainer();
    if (!container && input.hasChildren) throw new Error(`${shape.label} cannot contain elements`);
    if (container) for (const child of input.children) container.appendDetachedChild(child);
    return shape;
  }
}
