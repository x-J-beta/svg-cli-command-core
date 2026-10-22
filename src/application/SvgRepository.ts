import type { SvgDocument } from "../domain/SvgDocument.js";
import type { SvgReadResult } from "./SvgReadResult.js";

export interface SvgRepository {
  read(path: string): Promise<SvgReadResult>;
  write(path: string, document: SvgDocument): Promise<void>;
}
