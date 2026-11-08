import { SvgReader } from "../../dist/infrastructure/svg/SvgReader.js";
import { SvgWriter } from "../../dist/infrastructure/svg/SvgWriter.js";

export class FixedSvgRepository {
  #files;
  #reader;
  #writer = new SvgWriter();
  constructor(factory, files = {}) {
    this.#reader = new SvgReader(factory);
    this.#files = new Map(Object.entries(files));
  }
  async read(path) {
    if (!this.#files.has(path)) throw new Error(`cannot read file: ${path}`);
    try { return this.#reader.parse(this.#files.get(path)); }
    catch (error) { throw new Error(`invalid SVG: ${error.message}`); }
  }
  async write(path, document) {
    if (path === "readonly.svg") throw new Error(`cannot write file: ${path}`);
    this.#files.set(path, this.#writer.serialize(document));
  }
  content(path) { return this.#files.get(path); }
}
