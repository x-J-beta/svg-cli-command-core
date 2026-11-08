import { ContainerShape } from "../../../domain/ContainerShape.js";

export class Group extends ContainerShape {
  constructor(id: string) { super(id); }
  override get tagName(): string { return "g"; }
}
