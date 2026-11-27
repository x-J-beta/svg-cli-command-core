import type { AttributeHandler, AttributeTransaction, ShapeView } from "../../application/plugins/index.js";

export class BoxFillHandler implements AttributeHandler {
  readonly name = "box-fill";
  handles(target: ShapeView, attribute: string): boolean { return target.type === "box" && attribute === "fill"; }
  apply(target: ShapeView, _attribute: string, value: string, transaction: AttributeTransaction) {
    const rectangle = target.children.find((child) => child.id === `${target.id}-rect`)!;
    const previous = rectangle.readProperty("fill");
    transaction.set(rectangle.id, "fill", value);
    return { applied: `box#${target.id} fill propagated to ${rectangle.id}`,
      undone: `box#${target.id} fill restored: ${previous === undefined ? "(unset)" : JSON.stringify(previous)}` };
  }
}
