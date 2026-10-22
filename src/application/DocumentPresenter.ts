import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/Shape.js";

export class DocumentPresenter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.findActiveById(id);
      return [this.label(shape), ...this.children(shape.asContainer()?.children ?? [], "")];
    }
    return [`svg (${document.width}x${document.height})`, ...this.children(document.root.children, "")];
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

  private label(shape: Shape): string { return `${shape.label}${shape.summary ? `  ${shape.summary}` : ""}`; }
  private children(nodes: readonly Shape[], prefix: string): string[] {
    return nodes.flatMap((shape, index) => {
      const last = index === nodes.length - 1;
      return [
        `${prefix}${last ? "└── " : "├── "}${this.label(shape)}`,
        ...this.children(shape.asContainer()?.children ?? [], prefix + (last ? "    " : "│   ")),
      ];
    });
  }
}
