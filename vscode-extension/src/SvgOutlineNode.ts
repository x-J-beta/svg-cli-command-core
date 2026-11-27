export class SvgOutlineNode {
  readonly #tag: string;
  readonly #id: string | undefined;
  readonly #start: number;
  readonly #nameStart: number;
  readonly #nameEnd: number;
  readonly #children: SvgOutlineNode[] = [];
  #end: number;

  constructor(tag: string, id: string | undefined, start: number) {
    this.#tag = tag;
    this.#id = id;
    this.#start = start;
    this.#nameStart = start + 1;
    this.#nameEnd = this.#nameStart + tag.length;
    this.#end = this.#nameEnd;
  }

  get name(): string { return this.#id === undefined ? this.#tag : `${this.#tag}#${this.#id}`; }
  get start(): number { return this.#start; }
  get end(): number { return this.#end; }
  get nameStart(): number { return this.#nameStart; }
  get nameEnd(): number { return this.#nameEnd; }
  get children(): readonly SvgOutlineNode[] { return [...this.#children]; }

  append(child: SvgOutlineNode): void { this.#children.push(child); }
  close(end: number): void { this.#end = end; }
}
