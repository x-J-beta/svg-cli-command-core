import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SvgRepository } from "../../application/SvgRepository.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { SvgReadResult } from "../../application/SvgReadResult.js";
import { SvgReader } from "./SvgReader.js";
import { SvgWriter } from "./SvgWriter.js";

export class FileSvgRepository implements SvgRepository {
  readonly #reader: SvgReader;
  readonly #writer: SvgWriter;
  constructor(reader: SvgReader, writer = new SvgWriter()) { this.#reader = reader; this.#writer = writer; }

  async read(path: string): Promise<SvgReadResult> {
    let xml: string;
    try { xml = await readFile(path, "utf8"); }
    catch (cause) { throw new Error(`cannot read file: ${path}`, { cause }); }
    try { return this.#reader.parse(xml); }
    catch (error) { throw new Error(`invalid SVG: ${(error as Error).message.replace(/[\r\n]+/gu, " ")}`); }
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    const xml = this.#writer.serialize(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, xml, { encoding: "utf8", flag: "wx" });
      await rename(temporary, path);
    } catch (cause) {
      await unlink(temporary).catch(() => undefined);
      throw new Error(`cannot write file: ${path}`, { cause });
    }
  }
}
