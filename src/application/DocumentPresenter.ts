import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/Shape.js";
import type { DocumentChanges } from "./DocumentChanges.js";
import type { ExtensionRegistry } from "./plugins/ExtensionRegistry.js";
import { ShapeView } from "./plugins/ShapeView.js";

export class DocumentPresenter {
  readonly #extensions: ExtensionRegistry;
  readonly #changes: DocumentChanges;
  constructor(extensions: ExtensionRegistry, changes: DocumentChanges) {
    this.#extensions = extensions;
    this.#changes = changes;
  }

  tree(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.findActiveById(id);
      return [this.decorate(this.label(shape), shape), ...this.children(shape.asContainer()?.children ?? [], "")];
    }
    return [this.decorate(`svg (${document.width}x${document.height})`), ...this.children(document.root.children, "")];
  }

  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.findActiveById(id);
    const attributes = [...shape.svgAttributes()].filter(([name]) => name !== "id");
    return [
      `${shape.label}  parent=${shape.parent?.owner?.label ?? "svg"}`,
      `  ${attributes.map(([name, value]) => `${name}=${value}`).join(" ")}`,
      ...(shape.textContent !== undefined ? [`  text=${JSON.stringify(shape.textContent)}`] : []),
    ];
  }

  private label(shape: Shape): string { return `${shape.treeLabel}${shape.summary ? `  ${shape.summary}` : ""}`; }

  private decorate(text: string, shape?: Shape): string {
    const row = Object.freeze({
      text, shape: shape && new ShapeView(shape), changedSinceBaseline: this.#changes.includes(shape?.id),
    });
    const tags: string[] = [];
    for (const decorator of this.#extensions.decorators) {
      try {
        const tag = decorator.decorate(row);
        if (tag === undefined) continue;
        if (typeof tag !== "string") {
          void Promise.resolve(tag).catch(() => undefined);
          throw new Error("invalid tree label");
        }
        if (tag.trim() === "" || /[\r\n]/u.test(tag)) throw new Error("invalid tree label");
        tags.push(tag);
      } catch (failure) {
        const reason = failure instanceof Error ? failure.message : String(failure);
        throw new Error(`tree decorator ${decorator.name}: ${reason}`, { cause: failure });
      }
    }
    return [text, ...tags].join(" ");
  }
  private children(nodes: readonly Shape[], prefix: string): string[] {
    return nodes.flatMap((shape, index) => {
      const last = index === nodes.length - 1;
      return [
        `${prefix}${last ? "└── " : "├── "}${this.decorate(this.label(shape), shape)}`,
        ...this.children(shape.asContainer()?.children ?? [], prefix + (last ? "    " : "│   ")),
      ];
    });
  }
}
