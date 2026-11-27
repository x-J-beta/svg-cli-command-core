import type { Command, CommandArguments } from "../../application/plugins/index.js";
import type { DirectoryAccess } from "./DirectoryAccess.js";

export class DirCommand implements Command {
  readonly name = "dir";
  readonly syntax = "dir";
  readonly #directory: DirectoryAccess;
  constructor(directory: DirectoryAccess) { this.#directory = directory; }

  async execute(args: CommandArguments): Promise<readonly string[]> {
    args.requireCount(0);
    const path = this.#directory.currentDirectory();
    let entries;
    try { entries = await this.#directory.entries(path); }
    catch (cause) { throw new Error(`cannot read directory: ${path}`, { cause }); }
    const sorted = [...entries].sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
    });
    return sorted.length === 0 ? ["(empty directory)"]
      : sorted.map((entry) => `[${entry.isDirectory ? "DIR" : "FILE"}]  ${entry.name}`);
  }
}
