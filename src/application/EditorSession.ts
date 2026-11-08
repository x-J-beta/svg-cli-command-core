import { SvgDocument } from "../domain/SvgDocument.js";
import type { ShapeFactory } from "../domain/ShapeFactory.js";
import { ShapeProperties } from "../domain/ShapeProperties.js";
import type { ShapeContainer } from "../domain/ShapeContainer.js";
import type { SvgRepository } from "./SvgRepository.js";
import { CommandContext } from "./CommandContext.js";
import { CommandHistory } from "./CommandHistory.js";
import { DocumentPresenter } from "./DocumentPresenter.js";
import { DocumentChanges } from "./DocumentChanges.js";
import type { EditResult } from "./EditResult.js";
import type { ReversibleCommand } from "./commands/ReversibleCommand.js";
import { HandledAttributeCommand } from "./commands/HandledAttributeCommand.js";
import { SetPropertyCommand } from "./commands/SetPropertyCommand.js";
import type { CommandSession } from "./plugins/CommandSession.js";
import type { ExtensionRegistry } from "./plugins/ExtensionRegistry.js";
import { ShapeView } from "./plugins/ShapeView.js";

export class EditorSession implements CommandSession {
  readonly #repository: SvgRepository;
  readonly #factory: ShapeFactory;
  readonly #history = new CommandHistory();
  readonly #changes = new DocumentChanges();
  readonly #presenter: DocumentPresenter;
  readonly #extensions: ExtensionRegistry;
  #document: SvgDocument | undefined;
  #path: string | undefined;
  #exitRequested = false;

  constructor(repository: SvgRepository, factory: ShapeFactory, extensions: ExtensionRegistry) {
    this.#repository = repository;
    this.#factory = factory;
    this.#extensions = extensions;
    this.#presenter = new DocumentPresenter(extensions, this.#changes);
  }
  get factory(): ShapeFactory { return this.#factory; }
  get document(): SvgDocument {
    if (!this.#document) throw new Error("no document. use 'init' or 'read' first");
    return this.#document;
  }
  get rootShapes(): readonly ShapeView[] { return this.document.root.children.map((shape) => new ShapeView(shape)); }
  get context(): CommandContext { return new CommandContext(this.document); }
  get exitRequested(): boolean { return this.#exitRequested; }
  requestExit(): void { this.#exitRequested = true; }

  initialize(width: number, height: number): readonly string[] {
    const document = new SvgDocument(width, height);
    this.#document = document; this.#path = undefined;
    this.#history.onIoSucceeded(this.context);
    this.#changes.reset();
    return [`canvas ${width}x${height} created`];
  }

  async read(path: string): Promise<readonly string[]> {
    const loaded = await this.#repository.read(path);
    this.#document = loaded.document; this.#path = path;
    this.#history.onIoSucceeded(this.context);
    this.#changes.reset();
    return [...loaded.warnings, `read ${path} (${loaded.document.visibleShapes().length} elements)`];
  }

  async save(path?: string): Promise<readonly string[]> {
    const document = this.document;
    const destination = path ?? this.#path;
    if (!destination) throw new Error("no file path. use 'save <file.svg>' first");
    await this.#repository.write(destination, document);
    this.#path = destination;
    this.#history.onIoSucceeded(this.context);
    this.#changes.reset();
    return [`saved to ${destination} (${document.visibleShapes().length} elements)`];
  }

  canvas(width?: number, height?: number): readonly string[] {
    if (width !== undefined && height !== undefined) {
      this.document.resize(width, height);
      this.#history.onIoSucceeded(this.context);
      this.#changes.record([]);
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

  setAttribute(id: string, attribute: string, value: string): readonly string[] {
    const shape = this.document.findActiveById(id);
    const target = new ShapeView(shape);
    const handlers = this.#extensions.attributes.filter((handler) => {
      const result = handler.handles(target, attribute);
      if (typeof result !== "boolean") {
        void Promise.resolve(result).catch(() => undefined);
        throw new Error(`invalid attribute match: ${handler.name}`);
      }
      return result;
    });
    if (handlers.length > 1) {
      throw new Error(`conflicting attribute handlers for ${id}.${attribute}: ${handlers.map(({ name }) => name).join(", ")}`);
    }
    const handler = handlers[0];
    return this.edit(handler
      ? new HandledAttributeCommand(handler, shape, attribute, value)
      : new SetPropertyCommand(shape, attribute, ShapeProperties.parse(shape, attribute, value)));
  }

  edit(command: ReversibleCommand): readonly string[] { return this.committed(this.#history.executeNew(command, this.context)); }
  undo(): readonly string[] { return this.committed(this.#history.undo(this.context)); }
  redo(): readonly string[] { return this.committed(this.#history.redo(this.context)); }
  tree(id?: string): readonly string[] { return this.#presenter.tree(this.document, id); }
  show(id: string): readonly string[] { return this.#presenter.show(this.document, id); }

  private committed(result: EditResult): readonly string[] {
    this.#changes.record(result.changedIds);
    return [result.feedback];
  }
}
