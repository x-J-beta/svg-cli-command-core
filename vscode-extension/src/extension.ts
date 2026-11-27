import * as vscode from "vscode";
import { SvgFileDecorationProvider } from "./SvgFileDecorationProvider";
import { SvgDocumentSymbolProvider } from "./SvgDocumentSymbolProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new SvgFileDecorationProvider();
  context.subscriptions.push(
    provider,
    vscode.window.registerFileDecorationProvider(provider),
    vscode.languages.registerDocumentSymbolProvider({ pattern: "**/*.svg" }, new SvgDocumentSymbolProvider(), { label: "SVG Course" }),
    vscode.commands.registerCommand("svgCourse.showStatus", () =>
      vscode.window.showInformationMessage(`SVG Course Tools ${context.extension.packageJSON.version} is active. SVG badges and Outline are registered.`)),
  );
}
