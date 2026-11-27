export interface DirectoryEntry {
  readonly name: string;
  readonly isDirectory: boolean;
}

export interface DirectoryAccess {
  currentDirectory(): string;
  entries(path: string): Promise<readonly DirectoryEntry[]>;
}
