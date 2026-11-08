import { SaxesParser } from "saxes";
import { SvgDocument } from "../../domain/SvgDocument.js";
import type { ShapeFactory } from "../../domain/ShapeFactory.js";
import type { Shape } from "../../domain/Shape.js";
import { SvgReadResult } from "../../application/SvgReadResult.js";
import { SvgElement } from "./SvgElement.js";

export class SvgReader {
  readonly #factory: ShapeFactory;
  constructor(factory: ShapeFactory) { this.#factory = factory; }

  parse(xml: string): SvgReadResult {
    const root = this.parseXml(xml);
    if (root.name !== "svg") throw new Error("SVG root must be <svg>");
    const viewBox = root.attributes.get("viewBox");
    const viewValues = viewBox?.trim().split(/[\s,]+/u).map(Number);
    if (viewValues && (viewValues.length !== 4 || viewValues.some((value) => !Number.isFinite(value)) || viewValues[2]! <= 0 || viewValues[3]! <= 0)) {
      throw new Error("invalid SVG viewBox");
    }
    const document = new SvgDocument(
      this.dimension(root.attributes.get("width"), viewValues?.[2] ?? 800),
      this.dimension(root.attributes.get("height"), viewValues?.[3] ?? 600),
      viewBox,
    );
    for (const [name, value] of root.attributes) {
      if (!["xmlns", "width", "height", "viewBox"].includes(name)) document.retainSvgAttribute(name, value);
    }
    const reserved = new Set<string>();
    for (const element of root.descendants()) {
      const id = element.attributes.get("id");
      if (id !== undefined) {
        if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
        reserved.add(id);
      }
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const ids = new Map<SvgElement, string>();
    for (const element of root.descendants()) {
      if (element === root) continue;
      let id = element.attributes.get("id");
      if (id === undefined) {
        let next = counters.get(element.name) ?? 0;
        do { id = `${element.name}${++next}`; } while (reserved.has(id));
        counters.set(element.name, next); reserved.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${element.name}>`);
      }
      ids.set(element, id);
    }
    const materialize = (element: SvgElement): Shape => this.#factory.fromSvg({
      tag: element.name, id: ids.get(element)!, attributes: element.attributes,
      text: element.text, hasChildren: element.children.length > 0,
      get children() { return element.children.map(materialize); },
    });
    if (root.text.trim() !== "") throw new Error("unexpected text inside <svg>");
    for (const child of root.children) document.attachNew(materialize(child));
    return new SvgReadResult(document, warnings);
  }

  private parseXml(xml: string): SvgElement {
    const stack: SvgElement[] = [];
    let root: SvgElement | undefined;
    const parser = new SaxesParser({ xmlns: true });
    parser.on("doctype", () => { throw new Error("SVG document types are not supported"); });
    parser.on("opentag", (tag) => {
      if (tag.uri !== "" && tag.uri !== "http://www.w3.org/2000/svg") throw new Error(`unsupported element namespace: ${tag.uri}`);
      const attrs = new Map(Object.values(tag.attributes).map((attribute) => [attribute.name, attribute.value]));
      const element = new SvgElement(tag.local, attrs);
      const parent = stack.at(-1);
      if (parent) parent.appendChild(element);
      else root = element;
      stack.push(element);
    });
    parser.on("text", (text) => stack.at(-1)?.appendText(text));
    parser.on("cdata", (text) => stack.at(-1)?.appendText(text));
    parser.on("closetag", () => { stack.pop(); });
    parser.write(xml).close();
    if (!root) throw new Error("empty SVG document");
    return root;
  }

  private dimension(raw: string | undefined, fallback: number): number {
    if (raw === undefined) return fallback;
    const normalized = raw.trim().replace(/px$/u, "");
    const value = normalized === "" ? NaN : Number(normalized);
    if (!Number.isFinite(value) || value <= 0) throw new Error("invalid SVG canvas dimension");
    return value;
  }
}
