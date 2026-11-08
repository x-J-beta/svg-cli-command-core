import type { Shape } from "../../domain/Shape.js";
import { ShapeProperties } from "../../domain/ShapeProperties.js";
import type { CommandContext } from "../CommandContext.js";
import { EditResult } from "../EditResult.js";
import type { AttributeHandler } from "../plugins/AttributeHandler.js";
import { ShapeView } from "../plugins/ShapeView.js";
import { CommandBatch } from "./CommandBatch.js";
import type { ReversibleCommand } from "./ReversibleCommand.js";
import { SetPropertyCommand } from "./SetPropertyCommand.js";

export class HandledAttributeCommand implements ReversibleCommand {
  readonly #handler: AttributeHandler;
  readonly #target: Shape;
  readonly #attribute: string;
  readonly #value: string;

  constructor(handler: AttributeHandler, target: Shape, attribute: string, value: string) {
    this.#handler = handler;
    this.#target = target;
    this.#attribute = attribute;
    this.#value = value;
  }

  execute(context: CommandContext): EditResult {
    context.document.requireActive(this.#target);
    const applied: EditResult[] = [];
    let open = true;
    let writeFailure: { cause: unknown } | undefined;
    try {
      const feedback: unknown = this.#handler.apply(new ShapeView(this.#target), this.#attribute, this.#value, {
        set: (id, property, value) => {
          if (!open) throw new Error("attribute transaction is closed");
          try {
            const shape = context.document.findActiveById(id);
            let ancestor: Shape | null = shape;
            while (ancestor && ancestor !== this.#target) ancestor = ancestor.parent?.owner ?? null;
            if (ancestor === null) throw new Error(`attribute target is outside the selected subtree: ${id}`);
            applied.push(new SetPropertyCommand(shape, property, ShapeProperties.parse(shape, property, value)).execute(context));
          } catch (cause) {
            writeFailure ??= { cause };
            throw cause;
          }
        },
      });
      if (writeFailure) throw writeFailure.cause;
      const label = this.#target.label;
      let forward = `${label} updated: ${this.#attribute}=${JSON.stringify(this.#value)}`;
      let backward = `${label} restored: ${this.#attribute}`;
      if (feedback !== undefined) {
        if (typeof feedback === "object" && feedback !== null &&
            "applied" in feedback && typeof feedback.applied === "string" &&
            "undone" in feedback && typeof feedback.undone === "string") {
          forward = feedback.applied;
          backward = feedback.undone;
        } else {
          void Promise.resolve(feedback).catch(() => undefined);
          throw new Error("attribute handler must return synchronous feedback or nothing");
        }
      }
      const reversed = [...applied].reverse();
      return new EditResult(
        new CommandBatch(reversed.map((result) => result.inverse), backward, forward),
        forward,
        (rollbackContext) => { for (const result of reversed) result.rollback(rollbackContext); },
        applied.flatMap((result) => result.changedIds),
      );
    } catch (failure) {
      for (const result of applied.reverse()) result.rollback(context);
      const reason = failure instanceof Error ? failure.message : String(failure);
      throw new Error(`attribute handler ${this.#handler.name}: ${reason}`, { cause: failure });
    } finally {
      open = false;
    }
  }

  retainedNodes(): ReadonlySet<Shape> { return new Set([this.#target]); }
}
