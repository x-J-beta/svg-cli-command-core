import type { ReversibleCommand } from "../commands/ReversibleCommand.js";
import type { ShapeContainer } from "../../domain/ShapeContainer.js";
import type { ShapeFactory } from "../../domain/ShapeFactory.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { ShapeView } from "./ShapeView.js";

/** Public application operations available to CLI commands. */
export interface CommandSession {
  readonly document: SvgDocument;
  readonly rootShapes: readonly ShapeView[];
  readonly factory: ShapeFactory;
  initialize(width: number, height: number): readonly string[];
  read(path: string): Promise<readonly string[]>;
  save(path?: string): Promise<readonly string[]>;
  canvas(width?: number, height?: number): readonly string[];
  container(id: string): ShapeContainer;
  edit(command: ReversibleCommand): readonly string[];
  setAttribute(id: string, attribute: string, value: string): readonly string[];
  undo(): readonly string[];
  redo(): readonly string[];
  tree(id?: string): readonly string[];
  show(id: string): readonly string[];
  requestExit(): void;
}
