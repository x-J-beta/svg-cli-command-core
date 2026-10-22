/** Parsed XML input with behavior; it is never used as an undo snapshot. */
export class SvgElement {
  readonly #name: string;
  readonly #attributes: ReadonlyMap<string, string>;
  readonly #children: SvgElement[] = [];
  #text = "";
  constructor(name: string, attributes: ReadonlyMap<string, string>) {
    this.#name = name; this.#attributes = new Map(attributes);
  }
  get name(): string { return this.#name; }
  get attributes(): ReadonlyMap<string, string> { return this.#attributes; }
  get children(): readonly SvgElement[] { return this.#children; }
  get text(): string { return this.#text; }
  appendChild(child: SvgElement): void { this.#children.push(child); }
  appendText(text: string): void { this.#text += text; }
  *descendants(): Generator<SvgElement> {
    yield this;
    for (const child of this.#children) yield* child.descendants();
  }
}
