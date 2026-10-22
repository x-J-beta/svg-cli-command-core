import type { SvgDocument } from "../domain/SvgDocument.js";

export class CommandContext {
  readonly document: SvgDocument;

  constructor(document: SvgDocument) { this.document = document; }
}
