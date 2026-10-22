import { ShapeFactory } from "./domain/ShapeFactory.js";
import { EditorSession } from "./application/EditorSession.js";
import { CommandDispatcher } from "./application/CommandDispatcher.js";
import { FileSvgRepository } from "./infrastructure/svg/FileSvgRepository.js";
import { SvgReader } from "./infrastructure/svg/SvgReader.js";
import { CliRepl } from "./cli/CliRepl.js";

const factory = new ShapeFactory();
const session = new EditorSession(new FileSvgRepository(new SvgReader(factory)), factory);
await new CliRepl(new CommandDispatcher(), session).run();
