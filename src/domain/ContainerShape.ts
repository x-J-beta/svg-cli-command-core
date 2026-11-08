import { Shape } from "./Shape.js";
import { ShapeContainer } from "./ShapeContainer.js";
import type { GeometryTarget } from "./GeometryTarget.js";

export abstract class ContainerShape extends Shape {
  readonly #container: ShapeContainer;

  protected constructor(id: string, Container: new (owner: Shape) => ShapeContainer = ShapeContainer) {
    super(id);
    this.#container = new Container(this);
  }

  override asContainer(): ShapeContainer { return this.#container; }
  override moveTargets(dx: number, dy: number): readonly GeometryTarget[] {
    return this.#container.children.flatMap((child) => child.moveTargets(dx, dy));
  }
  override scaleTargets(factor: number): readonly GeometryTarget[] {
    return this.#container.children.flatMap((child) => child.scaleTargets(factor));
  }
}
