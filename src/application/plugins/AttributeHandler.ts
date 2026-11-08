import type { AttributeTransaction } from "./AttributeTransaction.js";
import type { ShapeView } from "./ShapeView.js";

export interface AttributeHandler {
  readonly name: string;
  handles(target: ShapeView, attribute: string): boolean;
  apply(target: ShapeView, attribute: string, value: string, transaction: AttributeTransaction):
    { readonly applied: string; readonly undone: string } | void;
}
