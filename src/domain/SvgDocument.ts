import type { Placement } from "./Placement.js";
import type { Shape } from "./Shape.js";
import { ShapeContainer } from "./ShapeContainer.js";
import { TemporaryContainer } from "./TemporaryContainer.js";

export class SvgDocument {
  readonly #root = new ShapeContainer();
  readonly #temporary = new TemporaryContainer();
  #width: number;
  #height: number;
  #viewBox: string;
  readonly #svgAttributes = new Map<string, string>();

  constructor(width = 800, height = 600, viewBox?: string) {
    this.validateSize(width, height);
    this.#width = width; this.#height = height;
    this.#viewBox = viewBox ?? `0 0 ${width} ${height}`;
  }

  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get viewBox(): string { return this.#viewBox; }
  get svgAttributes(): ReadonlyMap<string, string> { return new Map(this.#svgAttributes); }
  retainSvgAttribute(name: string, value: string): void { this.#svgAttributes.set(name, value); }
  resize(width: number, height: number): void {
    this.validateSize(width, height);
    this.#width = width; this.#height = height; this.#viewBox = `0 0 ${width} ${height}`;
  }

  private validateSize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("canvas dimensions must be positive finite numbers");
    }
  }

  get root(): ShapeContainer { return this.#root; }

  /** Trusted commands use this capability; public id lookup never exposes it. */
  temporaryForCommands(): ShapeContainer { return this.#temporary; }

  visibleShapes(): readonly Shape[] {
    return [...this.walkChildren(this.#root)];
  }

  findActiveById(id: string): Shape {
    for (const shape of this.walkChildren(this.#root)) {
      if (shape.id === id) return shape;
    }
    throw new Error(`no such shape: ${id}`);
  }

  requireActive(shape: Shape): void {
    if (shape.parent === null || this.containerRoot(shape.parent) !== this.#root) {
      throw new Error(`shape is not active: ${shape.id}`);
    }
  }

  placementOf(shape: Shape): Placement {
    if (shape.parent === null) throw new Error("shape has no parent");
    this.requireOwnedContainer(shape.parent);
    const index = shape.parent.indexOf(shape);
    if (index < 0) throw new Error("inconsistent parent relationship");
    return { parent: shape.parent, index };
  }

  attachNew(shape: Shape, target: ShapeContainer = this.root, index?: number): void {
    if (shape.parent !== null) throw new Error("new shape must be detached");
    this.validateDestination(shape, target, index ?? target.size, target.size);
    target.insertInternal(shape, index ?? target.size);
  }

  relocate(shape: Shape, target: ShapeContainer, index?: number): void {
    const old = this.placementOf(shape);
    if (old.parent !== target && !old.parent.canRemoveChild(shape)) {
      throw new Error(`cannot remove required child: ${shape.id}`);
    }
    // The requested index refers to the destination AFTER removing this node.
    const available = target.size - (old.parent === target ? 1 : 0);
    const destinationIndex = index ?? available;
    this.validateDestination(shape, target, destinationIndex, available);

    old.parent.removeInternal(shape);
    try {
      target.insertInternal(shape, destinationIndex);
    } catch (failure) {
      old.parent.insertInternal(shape, old.index);
      throw failure;
    }
  }

  /** @internal Rolls an uncommitted creation back to its original detached state. */
  discardUncommittedCreation(shape: Shape): void {
    const placement = this.placementOf(shape);
    placement.parent.removeInternal(shape);
  }

  releaseUnneededTemporaryRoots(retainedNodes: Iterable<Shape>): void {
    const kept = new Set<Shape>();
    for (const reference of retainedNodes) {
      let node: Shape | null = reference;
      while (node !== null) {
        if (node.parent === this.#temporary) { kept.add(node); break; }
        node = node.parent?.owner ?? null;
      }
    }
    for (const root of this.#temporary.children) {
      if (!kept.has(root)) this.#temporary.removeInternal(root);
    }
  }

  private requireOwnedContainer(container: ShapeContainer): void {
    const root = this.containerRoot(container);
    if (root !== this.#root && root !== this.#temporary) {
      throw new Error("container belongs to another document or is detached");
    }
  }

  private containerRoot(container: ShapeContainer): ShapeContainer {
    let current = container;
    while (current.owner?.parent) current = current.owner.parent;
    return current;
  }

  private validateDestination(
    shape: Shape, target: ShapeContainer, index: number, available: number,
  ): void {
    this.requireOwnedContainer(target);
    if (!Number.isInteger(index) || index < 0 || index > available) {
      throw new Error("invalid insertion index");
    }
    let ancestor = target.owner;
    while (ancestor !== null) {
      if (ancestor === shape) {
        throw new Error("cannot move a container into its own descendant");
      }
      ancestor = ancestor.parent?.owner ?? null;
    }
    if (this.containerRoot(target) !== this.#root) return;

    const incoming = new Set(this.walkShape(shape));
    const ids = new Set<string>();
    for (const node of incoming) {
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      ids.add(node.id);
    }
    for (const active of this.walkChildren(this.#root)) {
      if (!incoming.has(active) && ids.has(active.id)) {
        throw new Error(`id already exists: ${active.id}`);
      }
    }
  }

  private *walkShape(shape: Shape): Generator<Shape> {
    yield shape;
    const container = shape.asContainer();
    if (container) yield* this.walkChildren(container);
  }

  private *walkChildren(container: ShapeContainer): Generator<Shape> {
    for (const shape of container.children) yield* this.walkShape(shape);
  }
}
