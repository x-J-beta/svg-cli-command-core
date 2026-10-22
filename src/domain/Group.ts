import { Shape } from "./Shape.js";
import { ShapeContainer } from "./ShapeContainer.js";
import type { GeometryTarget } from "./GeometryTarget.js";

export class Group extends Shape {
  readonly #container = new ShapeContainer(this);

  constructor(id: string) { super(id); }

  override asContainer(): ShapeContainer { return this.#container; }
  override get tagName(): string { return "g"; }
  override moveTargets(dx: number, dy: number): readonly GeometryTarget[] {
    return this.#container.children.flatMap((child) => child.moveTargets(dx, dy));
  }
  override scaleTargets(factor: number): readonly GeometryTarget[] {
    return this.#container.children.flatMap((child) => child.scaleTargets(factor));
  }
}
