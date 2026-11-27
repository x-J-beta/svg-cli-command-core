import * as vscode from "vscode";
import { SvgOutlineParser } from "./SvgOutlineParser";
import type { SvgOutlineNode } from "./SvgOutlineNode";

export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  readonly #parser = new SvgOutlineParser();

  provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    try {
      const root = this.#parser.parse(document.getText());
      return token.isCancellationRequested ? [] : [this.symbol(root, document)];
    } catch {
      // Partially typed XML has no complete outline; the next request reparses the current buffer.
      return [];
    }
  }

  private symbol(node: SvgOutlineNode, document: vscode.TextDocument): vscode.DocumentSymbol {
    const symbol = new vscode.DocumentSymbol(
      node.name, "", node.children.length > 0 ? vscode.SymbolKind.Module : vscode.SymbolKind.Object,
      new vscode.Range(document.positionAt(node.start), document.positionAt(node.end)),
      new vscode.Range(document.positionAt(node.nameStart), document.positionAt(node.nameEnd)),
    );
    symbol.children = node.children.map((child) => this.symbol(child, document));
    return symbol;
  }
}
