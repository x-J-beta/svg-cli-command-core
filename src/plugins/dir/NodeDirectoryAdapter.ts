import { readdir } from "node:fs/promises";
import type { DirectoryAccess, DirectoryEntry } from "./DirectoryAccess.js";

export class NodeDirectoryAdapter implements DirectoryAccess {
  currentDirectory(): string { return process.cwd(); }
  async entries(path: string): Promise<readonly DirectoryEntry[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
  }
}
