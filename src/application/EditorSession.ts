import { SvgDocument } from "../domain/SvgDocument.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import type { ShapeContainer } from "../domain/ShapeContainer.js";
import type { SvgRepository } from "./SvgRepository.js";
import { CommandContext } from "./CommandContext.js";
import { CommandHistory } from "./CommandHistory.js";
import { DocumentPresenter } from "./DocumentPresenter.js";
import type { ReversibleCommand } from "./commands/ReversibleCommand.js";

export class EditorSession {
  readonly #repository: SvgRepository;
  readonly #factory: ShapeFactory;
  readonly #history = new CommandHistory();
  readonly #presenter = new DocumentPresenter();
  #document: SvgDocument | undefined;
  #path: string | undefined;
  #exitRequested = false;

  constructor(repository: SvgRepository, factory = new ShapeFactory()) { this.#repository = repository; this.#factory = factory; }
  get factory(): ShapeFactory { return this.#factory; }
  get document(): SvgDocument {
    if (!this.#document) throw new Error("no document. use 'init' or 'read' first");
    return this.#document;
  }
  get context(): CommandContext { return new CommandContext(this.document); }
  get exitRequested(): boolean { return this.#exitRequested; }
  requestExit(): void { this.#exitRequested = true; }

  initialize(width: number, height: number): readonly string[] {
    const document = new SvgDocument(width, height);
    this.#document = document; this.#path = undefined;
    this.#history.onIoSucceeded(this.context);
    return [`canvas ${width}x${height} created`];
  }

  async read(path: string): Promise<readonly string[]> {
    const loaded = await this.#repository.read(path);
    this.#document = loaded.document; this.#path = path;
    this.#history.onIoSucceeded(this.context);
    return [...loaded.warnings, `read ${path} (${loaded.document.visibleShapes().length} elements)`];
  }

  async save(path?: string): Promise<readonly string[]> {
    const document = this.document;
    const destination = path ?? this.#path;
    if (!destination) throw new Error("no file path. use 'save <file.svg>' first");
    await this.#repository.write(destination, document);
    this.#path = destination;
    this.#history.onIoSucceeded(this.context);
    return [`saved to ${destination} (${document.visibleShapes().length} elements)`];
  }

  canvas(width?: number, height?: number): readonly string[] {
    if (width !== undefined && height !== undefined) {
      this.document.resize(width, height);
      this.#history.onIoSucceeded(this.context);
    }
    return [`canvas ${this.document.width}x${this.document.height}`];
  }

  container(id: string): ShapeContainer {
    const shape = this.document.visibleShapes().find((node) => node.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    const container = shape.asContainer();
    if (!container) throw new Error(`not a container: ${id}`);
    return container;
  }

  edit(command: ReversibleCommand): readonly string[] { return [this.#history.executeNew(command, this.context).feedback]; }
  undo(): readonly string[] { return [this.#history.undo(this.context).feedback]; }
  redo(): readonly string[] { return [this.#history.redo(this.context).feedback]; }
  tree(id?: string): readonly string[] { return this.#presenter.tree(this.document, id); }
  show(id: string): readonly string[] { return this.#presenter.show(this.document, id); }
}
