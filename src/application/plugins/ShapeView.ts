import type { Shape } from "../../domain/Shape.js";
import type { PropertyValue } from "../../domain/PropertyValue.js";

export class ShapeView {
  readonly #shape: Shape;
  constructor(shape: Shape) { this.#shape = shape; }

  get id(): string { return this.#shape.id; }
  get type(): string { return this.#shape.type; }
  get tagName(): string { return this.#shape.tagName; }
  get isContainer(): boolean { return this.#shape.asContainer() !== undefined; }
  get children(): readonly ShapeView[] {
    return this.#shape.asContainer()?.children.map((shape) => new ShapeView(shape)) ?? [];
  }
  readProperty(name: string): PropertyValue | undefined { return this.#shape.readProperty(name); }
}
