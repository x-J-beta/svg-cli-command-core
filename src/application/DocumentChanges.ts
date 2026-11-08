import type { Shape } from "../domain/Shape.js";

export class DocumentChanges {
  readonly #ids = new Set<string>();
  #edited = false;

  record(ids: readonly string[]): void {
    this.#edited = true;
    for (const id of ids) this.#ids.add(id);
  }

  reset(): void { this.#edited = false; this.#ids.clear(); }
  includes(id?: string): boolean { return id === undefined ? this.#edited : this.#ids.has(id); }

  static path(shape: Shape): readonly string[] {
    const ids: string[] = [];
    let node: Shape | null = shape;
    while (node) { ids.push(node.id); node = node.parent?.owner ?? null; }
    return ids;
  }

  static subtree(shape: Shape): readonly string[] {
    return [shape.id, ...(shape.asContainer()?.children.flatMap((child) => this.subtree(child)) ?? [])];
  }
}
