import { SaxesParser } from "saxes";
import { SvgOutlineNode } from "./SvgOutlineNode";

export class SvgOutlineParser {
  parse(xml: string): SvgOutlineNode {
    const parser = new SaxesParser({ xmlns: true });
    const stack: SvgOutlineNode[] = [];
    let root: SvgOutlineNode | undefined;
    let openingStart = 0;
    parser.on("error", (error) => { throw error; });
    parser.on("doctype", () => { throw new Error("Document types are not supported"); });
    parser.on("opentagstart", () => {
      // This event precedes attributes, so '<' inside a quoted value cannot affect this offset.
      openingStart = xml.lastIndexOf("<", parser.position - 1);
    });
    parser.on("opentag", (tag) => {
      if (root === undefined && (tag.local !== "svg" ||
          (tag.uri !== "" && tag.uri !== "http://www.w3.org/2000/svg"))) {
        throw new Error("Expected an SVG root element");
      }
      const node = new SvgOutlineNode(tag.name, tag.attributes.id?.value, openingStart);
      const parent = stack.at(-1);
      if (parent) parent.append(node);
      else root = node;
      stack.push(node);
    });
    parser.on("closetag", () => { stack.pop()!.close(parser.position); });
    parser.write(xml).close();
    if (!root) throw new Error("Missing SVG root element");
    return root;
  }
}
