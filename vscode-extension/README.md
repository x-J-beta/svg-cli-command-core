# SVG Course Tools

Version 0.0.2 provides Explorer `[]` badges for `.svg` files and an SVG hierarchy in VS Code's native Outline view.

## Build and install

Open this directory in a terminal. Use the project's existing Node.js and TypeScript installations.

```powershell
npm install --cache ../.tools/npm-cache --ignore-scripts --no-audit --no-fund
npm test
npm run package
code --install-extension dist/svg-course-tools-0.0.2.vsix
```

Dependency downloads follow the repository's approval rules. Runtime dependencies are saxes 6.0.0 and its xmlchars dependency. Development uses @types/vscode 1.85.0. The VSIX includes the runtime dependencies and can run independently of the CLI repository.

Run `Developer: Reload Window` after updating the installed extension. Open `examples/outline.svg` as text and expand Explorer's Outline section. `SVG Course: Show Extension Status` confirms that badges and document symbols have been registered. Explorer file decoration badges must be enabled to display `[]`.

For source navigation, configure VS Code to open SVG files in the text editor. Set this in user or workspace settings, then reopen an existing SVG preview with `View: Reopen Editor With...` and select `Text Editor`.

```json
"workbench.editorAssociations": {
  "*.svg": "default"
}
```

The real-host H04 scenario reproduced `imagePreview.previewEditor` when opening the SVG at a symbol position with the default association. With the text-editor association, the same request opened a text tab and placed the cursor at the symbol's selection start. This setting is necessary in the tested VS Code installation for source navigation.

For F5 debugging, open `vscode-extension/` itself as the workspace, then select `SVG Course Extension`. The build task runs before the Extension Development Host starts.

## Behavior

- Only `.svg` files receive a badge. Directories, including directories named `folder.svg`, receive none. Decorations do not propagate to parent directories. Creating or deleting SVG paths invalidates the corresponding decoration.
- Outline includes the root SVG, nested elements and leaves. Names use `tag#id` when an id is present, otherwise the tag. Element types such as path, title and defs can appear without CLI shape plugins.
- Full element ranges and opening-tag name ranges use original UTF-16 source offsets. Clicking an Outline node lets VS Code navigate to its selection range.
- The provider parses the current text buffer on each request. Unsaved edits are included. Incomplete or malformed XML produces an empty outline, and valid XML restores it on the next request. Parsing preserves the text buffer and does not assign ids.

## Tests and evidence

`npm test` runs nine fixed tests, including badge filtering, missing files, cancellation, disposal, nested groups, absent ids, namespaces, entity-decoded ids, CRLF, emoji, comments, CDATA, quoted `>`, source ranges, editing and malformed XML recovery.

`npm run test:host` runs four integration scenarios in the installed VS Code executable's Extension Development Host. On Windows it locates VS Code through `code` on PATH; set `VSCODE_EXECUTABLE` to the application executable when needed. H01 checks activation, symbol hierarchy, unnamed text and source selection ranges. H02 changes an unsaved id and checks the new symbol. H03 checks incomplete XML and recovery. H04 checks opening a symbol position through the text-editor association and restores the test profile's prior setting afterward. Results are written to `dist/host-test-results.txt`. The runner uses an isolated profile and extension directory under `dist/`.

Set `SVG_EXTENSION_TEST_PATH` to the installed extension directory to run the same scenarios against the installed VSIX runtime.

On 2026-11-27, full TypeScript compilation, all nine fixed tests and H01-H04 passed. The user supplied three real VS Code screenshots showing Explorer file badge comparisons and Outline selection of a leaf and a container with the corresponding source lines highlighted.

The [leaf selection screenshot](../docs/images/vscode-svg-outline-leaf.png) selects `rect#process` at line 9. The [container selection screenshot](../docs/images/vscode-svg-outline-group.png) selects `g#node1` at line 4. These screenshots use `examples/flowchart.svg` at repository root.

The [Explorer badge screenshot](../docs/images/vscode-svg-badge.png) shows `flowchart.svg` and `other.svg` with `[]`, while `flowchart.commands.txt` and the examples folder heading have no badge. It also shows `line#arrow1` selected at source line 12. Editing and malformed-input recovery are covered by the fixed and host tests described above.

## Host responsibilities and design patterns

`extension.ts` composes the providers. VS Code calls `activate` after an activation event, requests file decorations as resources are displayed, requests document symbols for the current document, renders the native views and navigates using the returned ranges. Registration and provider resources are owned through `context.subscriptions` and released when the extension is deactivated.

`SvgFileDecorationProvider` implements VS Code's `FileDecorationProvider` interface. It combines a filesystem lookup, a watcher and an event emitter, then returns `FileDecoration` metadata. File decoration adds information to an existing presentation, which corresponds to the intent of Decorator. The classic structural pattern wraps an object through the same component interface. Here, the host combines resource metadata from a registered provider, so the provider does not wrap an Explorer row object.

`SvgDocumentSymbolProvider` is an Adapter. Its target interface is `DocumentSymbolProvider`, its adaptee is the position-aware `SvgOutlineParser` and `SvgOutlineNode` tree, and VS Code is the client. It converts domain nodes and offsets into `DocumentSymbol` and `Range` instances. The file decoration provider also adapts filesystem facts into the host's decoration interface.

## CLI reuse assessment

Both tools use saxes and stack-based XML traversal. There is currently no shared project source module. The CLI's `SvgReader` also validates its supported shapes, assigns missing ids and constructs an editable `SvgDocument`. Its `SvgElement` and `Shape` objects do not carry source ranges. Outline needs the original missing ids, arbitrary SVG elements and exact buffer positions. This extension therefore uses a separate position-aware parser and node class, and reuses the existing XML library.

`SvgOutlineNode` encapsulates its fields and exposes ordered children. The symbol provider recursively translates that hierarchy. Sharing a future position-aware XML representation would require moving XML parsing out of the CLI reader and preserving its existing warnings and validation behavior; the current extension does not require that refactoring.

## Review of AI-generated changes

- A first test launch passed relative extension paths. VS Code resolved them against its own working directory and did not load the intended extension. The test runner now derives absolute paths from its own directory and invokes the application executable directly.
- The host test initially assumed an empty symbol query always returned an array. Real VS Code returned undefined for incomplete XML. The test now normalizes an absent result to an empty list.
- Offset tests include emoji and CRLF because source positions use UTF-16 string offsets. Opening-tag offsets are captured before attributes are parsed, which prevents quoted `>` from affecting source navigation.
