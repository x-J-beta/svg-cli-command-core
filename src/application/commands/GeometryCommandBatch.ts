import type { GeometryTarget } from "../../domain/GeometryTarget.js";
import { CommandBatch } from "./CommandBatch.js";
import { SetPropertyCommand } from "./SetPropertyCommand.js";

/** Validates every computed result before the first property is changed. */
export class GeometryCommandBatch extends CommandBatch {
  constructor(targets: readonly GeometryTarget[], feedback: string, inverseFeedback: string) {
    for (const { shape, name, value } of targets) {
      if (!Number.isFinite(value)) throw new Error(`geometry result must be finite: ${shape.label}.${name}`);
    }
    super(targets.map(({ shape, name, value }) => new SetPropertyCommand(shape, name, value)), feedback, inverseFeedback);
  }
}
