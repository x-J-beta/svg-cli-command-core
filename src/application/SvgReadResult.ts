import type { SvgDocument } from "../domain/SvgDocument.js";

export class SvgReadResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
  constructor(document: SvgDocument, warnings: readonly string[]) {
    this.document = document; this.warnings = [...warnings];
  }
}
