import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { Shape } from "../../domain/Shape.js";

export class SvgWriter {
  serialize(document: SvgDocument): string {
    const attributes = new Map(document.svgAttributes);
    attributes.set("xmlns", "http://www.w3.org/2000/svg");
    attributes.set("width", String(document.width)); attributes.set("height", String(document.height));
    attributes.set("viewBox", document.viewBox);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg${this.attributes(attributes)}>\n` +
      document.root.children.map((shape) => this.element(shape, 1)).join("") + "</svg>\n";
  }

  private element(shape: Shape, depth: number): string {
    const indent = "  ".repeat(depth);
    const open = `${indent}<${shape.tagName}${this.attributes(shape.svgAttributes())}`;
    const container = shape.asContainer();
    if (container) {
      return `${open}>\n` + container.children.map((child) => this.element(child, depth + 1)).join("") + `${indent}</${shape.tagName}>\n`;
    }
    if (shape.textContent !== undefined) return `${open}>${this.escape(shape.textContent)}</${shape.tagName}>\n`;
    return `${open}/>\n`;
  }

  private attributes(attributes: ReadonlyMap<string, string>): string {
    return [...attributes].map(([name, value]) => ` ${name}="${this.escape(value).replace(/\t/gu, "&#9;").replace(/\n/gu, "&#10;")}"`).join("");
  }

  private escape(value: string): string {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if ((point < 32 && point !== 9 && point !== 10 && point !== 13) ||
          (point >= 0xd800 && point <= 0xdfff) || point === 0xfffe || point === 0xffff) {
        throw new Error("value contains a character not allowed in XML");
      }
    }
    return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
      .replace(/"/gu, "&quot;").replace(/'/gu, "&apos;").replace(/\r/gu, "&#13;");
  }
}
