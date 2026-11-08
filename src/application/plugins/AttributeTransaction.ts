export interface AttributeTransaction {
  /** Set an allowed property of the target or one of its descendants. */
  set(id: string, property: string, value: string): void;
}
