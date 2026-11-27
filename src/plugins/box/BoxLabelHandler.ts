import type { AttributeHandler, AttributeTransaction, ShapeView } from "../../application/plugins/index.js";

export class BoxLabelHandler implements AttributeHandler {
  readonly name = "box-label";
  handles(target: ShapeView, attribute: string): boolean { return target.type === "box" && attribute === "label"; }
  apply(target: ShapeView, _attribute: string, value: string, transaction: AttributeTransaction) {
    const label = target.children.find((child) => child.id === `${target.id}-label`)!;
    const previous = label.readProperty("text");
    transaction.set(label.id, "text", value);
    return { applied: `box#${target.id} label updated: ${JSON.stringify(value)}`,
      undone: `box#${target.id} label restored: ${JSON.stringify(previous)}` };
  }
}
