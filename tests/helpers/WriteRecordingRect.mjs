import { Rect } from "svg-cli-command-core";

export class WriteRecordingRect extends Rect {
  #writes = 0;
  get writeCount() { return this.#writes; }
  writeProperty(name, value) {
    super.writeProperty(name, value);
    // The superclass initializes geometry before subclass fields exist.
    if (#writes in this) this.#writes++;
  }
}
