import type { PropertyValue } from "./PropertyValue.js";
import type { ShapeContainer } from "./ShapeContainer.js";
import type { CreationParameter, PropertyDefinition } from "./PropertyDefinition.js";
import type { GeometryTarget } from "./GeometryTarget.js";

export abstract class Shape {
  readonly #id: string;
  #parent: ShapeContainer | null = null;
  readonly #properties = new Map<string, PropertyValue>();
  readonly #imported = new Map<string, string>();

  protected constructor(id: string) {
    if (id.length === 0 || /[\s\u0000-\u001f]/u.test(id)) throw new Error("id must not be empty or contain whitespace");
    this.#id = id;
  }

  get id(): string { return this.#id; }
  get parent(): ShapeContainer | null { return this.#parent; }
  get tagName(): string { return "shape"; }
  get type(): string { return this.tagName; }
  get label(): string { return `${this.tagName}#${this.id}`; }
  get treeLabel(): string { return this.label; }
  creationFeedback(parent?: string): string {
    return `${this.label} created${parent ? ` in ${parent}` : ""}`;
  }
  moveFeedback(dx: number, dy: number): readonly [applied: string, undone: string] {
    return [`${this.label} moved by (${dx},${dy})`, `${this.label} move undone`];
  }
  get creationParameters(): readonly CreationParameter[] { return []; }
  get propertyDefinitions(): readonly PropertyDefinition[] {
    return [
      { name: "fill", type: "string" }, { name: "stroke", type: "string" },
      { name: "stroke-width", type: "number", minimum: 0 },
    ];
  }

  get summary(): string {
    return [...this.svgAttributes()].filter(([name]) => name !== "id")
      .map(([name, value]) => `${name}=${value}`).join(" ");
  }

  moveTargets(_dx: number, _dy: number): readonly GeometryTarget[] { return []; }
  scaleTargets(_factor: number): readonly GeometryTarget[] { return []; }

  retainSvgAttribute(name: string, value: string): void { this.#imported.set(name, value); }

  svgAttributes(): ReadonlyMap<string, string> {
    const attributes = new Map(this.#imported);
    attributes.set("id", this.id);
    for (const [name, value] of this.#properties) {
      if (name !== "text") attributes.set(name, String(value));
    }
    return attributes;
  }

  get textContent(): string | undefined { return undefined; }

  asContainer(): ShapeContainer | undefined { return undefined; }

  readProperty(name: string): PropertyValue | undefined {
    return this.#properties.get(name);
  }

  writeProperty(name: string, value: PropertyValue | undefined): void {
    this.validateProperty(name, value);
    if (value === undefined) this.#properties.delete(name);
    else this.#properties.set(name, value);
  }

  /** @internal Only ShapeContainer maintains the parent relationship. */
  setParentFromContainer(parent: ShapeContainer | null): void {
    this.#parent = parent;
  }

  protected validateProperty(name: string, value: PropertyValue | undefined): void {
    const definition = this.propertyDefinitions.find((item) => item.name === name);
    if (!definition) throw new Error(`unknown attribute: ${name}`);
    if (value === undefined) return;
    if (definition.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) ||
          (definition.minimum !== undefined && value < definition.minimum)) {
        throw new Error(`${name} must be a finite${definition.minimum === 0 ? " non-negative" : ""} number`);
      }
    } else if (typeof value !== "string") {
      throw new Error(`${name} must be a string`);
    }
  }
}
