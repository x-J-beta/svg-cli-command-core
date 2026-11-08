import { Shape } from "./Shape.js";
import type { ShapeProvider } from "./ShapeProvider.js";
import type { SvgShapeInput } from "./SvgShapeInput.js";
import { ShapeProperties } from "./ShapeProperties.js";
import type { PropertyValue } from "./PropertyValue.js";

export class ShapeFactory {
  readonly #find: (type: string) => ShapeProvider | undefined;
  constructor(find: (type: string) => ShapeProvider | undefined) { this.#find = find; }

  create(type: string, id: string): Shape {
    const provider = this.requireProvider(type);
    return this.validate(provider, id, provider.createEmpty ? provider.createEmpty(id) : provider.create(id, []));
  }

  parseProperty(shape: Shape, name: string, raw: string): PropertyValue { return ShapeProperties.parse(shape, name, raw); }

  fromArguments(type: string, id: string, values: readonly string[]): Shape {
    const provider = this.requireProvider(type);
    return this.validate(provider, id, provider.create(id, values));
  }

  fromSvg(input: SvgShapeInput): Shape {
    const kind = input.attributes.get("data-kind");
    const marked = kind === undefined ? undefined : this.#find(kind);
    const provider = marked?.svgTag === input.tag ? marked : this.requireProvider(input.tag);
    let children: readonly Shape[] | undefined;
    const shape = this.validate(provider, input.id, provider.fromSvg({
      tag: input.tag, id: input.id, attributes: input.attributes, text: input.text, hasChildren: input.hasChildren,
      get children() { return children ??= Object.freeze([...input.children]); },
    }));
    const expected = children ?? input.children;
    const actual = shape.asContainer()?.children ?? [];
    if (actual.length !== expected.length || actual.some((child, index) => child !== expected[index])) {
      throw new Error(`provider did not preserve SVG children: ${provider.name}`);
    }
    return shape;
  }

  private requireProvider(type: string): ShapeProvider {
    const provider = this.#find(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider;
  }

  private validate(provider: ShapeProvider, id: string, shape: Shape): Shape {
    if (!(shape instanceof Shape) || shape.id !== id || shape.type !== provider.name || shape.parent !== null) {
      if (shape instanceof Promise) void shape.catch(() => undefined);
      throw new Error(`invalid shape returned by provider: ${provider.name}`);
    }
    return shape;
  }
}
