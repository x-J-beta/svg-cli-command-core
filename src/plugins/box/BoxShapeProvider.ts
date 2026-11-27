import type { PluginContext, ShapeProvider, SvgShapeInput, Shape } from "../../application/plugins/index.js";
import { Box } from "./Box.js";

export class BoxShapeProvider implements ShapeProvider {
  readonly name = "box";
  readonly svgTag = "g";
  readonly #create: PluginContext["createShape"];
  readonly #fill: string;
  constructor(create: PluginContext["createShape"], fill = "#4a90d9") { this.#create = create; this.#fill = fill; }

  create(id: string, values: readonly string[]): Shape {
    if (values.length !== 5) throw new Error("invalid parameters for box");
    const [x, y, width, height] = values.slice(0, 4).map((value) => value.trim() === "" ? NaN : Number(value));
    if (![x, y, width, height].every(Number.isFinite) || width! < 0 || height! < 0) {
      throw new Error("box geometry must be finite with non-negative dimensions");
    }
    const box = new Box(id);
    const rectangle = this.#create("rect", `${id}-rect`, [String(x), String(y), String(width), String(height), this.#fill]);
    const label = this.#create("text", `${id}-label`, [String(x! + 20), String(y! + height! / 2 + 5), values[4]!]);
    box.asContainer().appendDetachedChild(rectangle);
    box.asContainer().appendDetachedChild(label);
    return box;
  }

  fromSvg(input: SvgShapeInput): Shape {
    const children = input.children;
    const rectangle = children.filter((child) => child.id === `${input.id}-rect`);
    const label = children.filter((child) => child.id === `${input.id}-label`);
    if (input.tag !== "g" || input.text.trim() !== "" || rectangle.length !== 1 || label.length !== 1 ||
      rectangle[0]!.type !== "rect" || label[0]!.type !== "text") {
      throw new Error(`invalid box structure: ${input.id}`);
    }
    const box = new Box(input.id);
    for (const [name, value] of input.attributes) {
      if (name !== "id" && name !== "data-kind") box.retainSvgAttribute(name, value);
    }
    for (const child of children) box.asContainer().appendDetachedChild(child);
    return box;
  }
}
