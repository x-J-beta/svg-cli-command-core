import { ContainerShape } from "../../application/plugins/index.js";
import { BoxContainer } from "./BoxContainer.js";

export class Box extends ContainerShape {
  constructor(id: string) { super(id, BoxContainer); }
  override get type(): string { return "box"; }
  override get tagName(): string { return "g"; }
  override get label(): string { return `box#${this.id}`; }
  override get treeLabel(): string { return `g#${this.id}`; }
  override get summary(): string { return ""; }
  override creationFeedback(parent?: string): string {
    return `${this.label} created (g#${this.id} + rect#${this.id}-rect + text#${this.id}-label)${parent ? ` in ${parent}` : ""}`;
  }
  override moveFeedback(dx: number, dy: number): readonly [string, string] {
    return [`${this.label} moved by (${dx},${dy})`, `${this.label} moved back by (${-dx},${-dy})`];
  }
  override svgAttributes(): ReadonlyMap<string, string> {
    return new Map([...super.svgAttributes(), ["data-kind", "box"]]);
  }
}
