export class CommandArguments {
  readonly #values: readonly string[];
  readonly #syntax: string;
  constructor(values: readonly string[], syntax: string) { this.#values = [...values]; this.#syntax = syntax; }
  get values(): readonly string[] { return this.#values; }
  get count(): number { return this.#values.length; }
  requireCount(minimum: number, maximum = minimum): void {
    if (this.count < minimum || this.count > maximum) throw new Error(`usage: ${this.#syntax}`);
  }
  at(index: number): string {
    const value = this.#values[index];
    if (value === undefined) throw new Error(`usage: ${this.#syntax}`);
    return value;
  }
  number(index: number): number {
    const raw = this.at(index);
    const value = raw.trim() === "" ? NaN : Number(raw);
    if (!Number.isFinite(value)) throw new Error(`expected finite number: ${raw}`);
    return value;
  }
}
