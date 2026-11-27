import { ShapeContainer } from "../../application/plugins/index.js";
import type { Shape } from "../../application/plugins/index.js";

export class BoxContainer extends ShapeContainer {
  override get canUngroup(): boolean { return false; }
  override canRemoveChild(shape: Shape): boolean {
    return shape.id !== `${this.owner!.id}-rect` && shape.id !== `${this.owner!.id}-label`;
  }
}
