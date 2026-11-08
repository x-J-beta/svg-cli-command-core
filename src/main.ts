import { CliAssembly } from "./host/CliAssembly.js";
import { CliRepl } from "./cli/CliRepl.js";

const assembly = new CliAssembly();
await new CliRepl(assembly.dispatcher, assembly.createSession()).run();
