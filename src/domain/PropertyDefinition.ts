export interface PropertyDefinition {
  readonly name: string;
  readonly type: "number" | "string";
  readonly minimum?: number;
}

export interface CreationParameter {
  readonly name: string;
  readonly optional?: boolean;
}
