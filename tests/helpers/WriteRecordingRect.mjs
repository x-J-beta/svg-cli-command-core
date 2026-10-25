import { Rect } from "../../dist/application/commands/index.js";

export class WriteRecordingRect extends Rect {
  #writes = 0;
  get writeCount() { return this.#writes; }
  writeProperty(name, value) {
    super.writeProperty(name, value);
    // The superclass initializes geometry before subclass fields exist.
    if (#writes in this) this.#writes++;
  }
}
