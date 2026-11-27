import { CliRepl } from "../cli/CliRepl.js";
import { CliAssembly } from "./CliAssembly.js";
import { CodePlugins } from "./CodePlugins.js";
import { PluginInstaller } from "./PluginInstaller.js";
import { PluginLoader } from "./PluginLoader.js";

export class CliStartup {
  async run(args: readonly string[]): Promise<void> {
    const assembly = new CliAssembly();
    const report = (message: string): void => { process.stderr.write(message + "\n"); };
    const installer = new PluginInstaller(assembly.extensions, report);
    const loader = new PluginLoader(installer, report);
    if (args.length === 1 && args[0] === "--plugins") await new CodePlugins().activate(installer, loader);
    else if (args.length === 2 && args[0] === "--config") await loader.loadConfig(args[1]!);
    else if (args.length !== 0) { report("error: usage: svg-editor [--plugins | --config <file>]"); process.exitCode = 1; return; }
    await new CliRepl(assembly.dispatcher, assembly.createSession()).run();
  }
}
