import * as vscode from "vscode";

export class SvgFileDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  readonly #changed = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly #watcher = vscode.workspace.createFileSystemWatcher("**/*.svg");
  readonly #subscriptions: vscode.Disposable[];
  readonly onDidChangeFileDecorations = this.#changed.event;

  constructor() {
    this.#subscriptions = [
      this.#watcher.onDidCreate((uri) => this.#changed.fire(uri)),
      this.#watcher.onDidDelete((uri) => this.#changed.fire(uri)),
    ];
  }

  async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.FileDecoration | undefined> {
    if (!uri.path.endsWith(".svg") || token.isCancellationRequested) return undefined;
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (token.isCancellationRequested || (stat.type & vscode.FileType.File) === 0 ||
          (stat.type & vscode.FileType.Directory) !== 0) return undefined;
      const decoration = new vscode.FileDecoration("[]", "SVG file");
      decoration.propagate = false;
      return decoration;
    } catch {
      return undefined;
    }
  }

  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
    this.#watcher.dispose();
    this.#changed.dispose();
  }
}
