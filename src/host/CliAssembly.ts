import { EditorSession } from "../application/EditorSession.js";
import { CommandDispatcher } from "../application/CommandDispatcher.js";
import type { SvgRepository } from "../application/SvgRepository.js";
import { ExtensionRegistry } from "../application/plugins/ExtensionRegistry.js";
import { BuiltinShapes } from "../plugins/builtin/BuiltinShapes.js";
import { BuiltinCommands } from "../plugins/builtin/BuiltinCommands.js";
import { FileSvgRepository } from "../infrastructure/svg/FileSvgRepository.js";
import { SvgReader } from "../infrastructure/svg/SvgReader.js";

export class CliAssembly {
  readonly extensions = new ExtensionRegistry();
  readonly factory = this.extensions.factory;
  readonly dispatcher = new CommandDispatcher(this.extensions);

  constructor() {
    this.extensions.activate(new BuiltinShapes());
    this.extensions.activate(new BuiltinCommands(() => this.extensions.commands.map((command) => command.syntax)));
  }

  createSession(repository: SvgRepository = new FileSvgRepository(new SvgReader(this.factory))): EditorSession {
    return new EditorSession(repository, this.factory, this.extensions);
  }
}
