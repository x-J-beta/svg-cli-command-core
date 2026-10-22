import type { Shape } from "./Shape.js";

export class ShapeContainer {
  readonly #owner: Shape | null;
  readonly #children: Shape[] = [];

  constructor(owner: Shape | null = null) { this.#owner = owner; }

  get owner(): Shape | null { return this.#owner; }
  get size(): number { return this.#children.length; }
  get children(): readonly Shape[] { return Object.freeze([...this.#children]); }

  indexOf(shape: Shape): number { return this.#children.indexOf(shape); }

  /** @internal Called by validated document operations. */
  insertInternal(shape: Shape, index: number): void {
    if (shape.parent !== null) throw new Error("shape already has a parent");
    if (!Number.isInteger(index) || index < 0 || index > this.size) {
      throw new Error("invalid insertion index");
    }
    let ancestor = this.owner;
    while (ancestor !== null) {
      if (ancestor === shape) throw new Error("cannot create a tree cycle");
      ancestor = ancestor.parent?.owner ?? null;
    }
    this.#children.splice(index, 0, shape);
    shape.setParentFromContainer(this);
  }

  /** @internal Called by validated document operations. */
  removeInternal(shape: Shape): void {
    const index = this.indexOf(shape);
    if (index < 0 || shape.parent !== this) {
      throw new Error("shape does not belong to this container");
    }
    this.#children.splice(index, 1);
    shape.setParentFromContainer(null);
  }
}
