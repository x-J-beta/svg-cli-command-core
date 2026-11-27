const assert = require("node:assert/strict");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");

exports.run = async function run() {
  const extension = vscode.extensions.getExtension("course271.svg-course-tools");
  assert.ok(extension, "Development extension must be discoverable");
  await extension.activate();
  assert.ok(extension.isActive);
  assert.ok((await vscode.commands.getCommands()).includes("svgCourse.showStatus"));
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(join(__dirname, "../examples/outline.svg")));
  const editor = await vscode.window.showTextDocument(document);
  const symbols = async () => (await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri)) ?? [];
  const original = document.getText();
  const replace = async (source) => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source);
    assert.equal(await vscode.workspace.applyEdit(edit), true);
  };
  const evidence = [];
  try {
    const root = (await symbols())[0];
    assert.equal(root.name, "svg");
    assert.equal(root.children[0].name, "g#workflow");
    assert.equal(root.children[0].children[1].name, "text");
    assert.equal(root.children[0].children[2].children[0].name, "circle#end");
    const rectangle = root.children[0].children[0];
    assert.equal(rectangle.name, "rect#start");
    assert.equal(rectangle.selectionRange.start.line, 2);
    assert.equal(document.getText(rectangle.selectionRange), "rect");
    editor.selection = new vscode.Selection(rectangle.selectionRange.start, rectangle.selectionRange.end);
    editor.revealRange(rectangle.selectionRange);
    assert.equal(document.getText(editor.selection), "rect");
    evidence.push("H01 real host activation, native symbols, hierarchy, unnamed element and source ranges passed");
    await replace(original.replace('id="start"', 'id="edited"'));
    assert.equal((await symbols())[0].children[0].children[0].name, "rect#edited");
    assert.equal(document.isDirty, true);
    evidence.push("H02 unsaved edit buffer updated the symbol name");
    await replace('<svg><g>');
    assert.equal((await symbols()).length, 0);
    await replace(original);
    assert.equal((await symbols())[0].children[0].children[0].name, "rect#start");
    evidence.push("H03 incomplete XML cleared the outline and repaired XML restored it");
  } finally {
    if (document.getText() !== original) await replace(original);
    await vscode.commands.executeCommand("workbench.action.files.revert");
  }
  const configuration = vscode.workspace.getConfiguration("workbench");
  const previousAssociations = configuration.inspect("editorAssociations").globalValue;
  try {
    const target = (await symbols())[0].children[0].children[0].selectionRange.start;
    const selection = new vscode.Range(target, target);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await vscode.commands.executeCommand("vscode.open", document.uri, { selection });
    const before = vscode.window.tabGroups.activeTabGroup.activeTab.input;
    console.log(`H04 before association: ${before instanceof vscode.TabInputCustom ? before.viewType : "text"}`);
    await configuration.update("editorAssociations", { ...previousAssociations, "*.svg": "default" }, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await vscode.commands.executeCommand("vscode.open", document.uri, { selection });
    assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab.input instanceof vscode.TabInputText);
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), document.uri.toString());
    assert.ok(vscode.window.activeTextEditor.selection.active.isEqual(target));
    evidence.push("H04 SVG source association opened the text editor at the requested symbol position");
  } finally {
    await configuration.update("editorAssociations", previousAssociations, vscode.ConfigurationTarget.Global);
  }
  writeFileSync(join(__dirname, "../dist/host-test-results.txt"), evidence.join("\n") + "\n");
  console.log(evidence.join("\n"));
};
