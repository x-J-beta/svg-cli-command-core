import { CliAssembly } from "../../dist/host/CliAssembly.js";
import { CliRepl } from "../../dist/cli/CliRepl.js";
import { PluginInstaller } from "../../dist/host/PluginInstaller.js";
import { PluginLoader } from "../../dist/host/PluginLoader.js";
import stats from "../../dist/plugins/stats/StatsPlugin.js";
import directory from "../../dist/plugins/dir/DirPlugin.js";
import box from "../../dist/plugins/box/BoxPlugin.js";
import { fileURLToPath } from "node:url";

const assembly = new CliAssembly();
const report = (message) => process.stderr.write(message + "\n");
const installer = new PluginInstaller(assembly.extensions, report);
const loader = new PluginLoader(installer, report);
for (const [plugin, path] of [[stats, "stats"], [directory, "dir"], [box, "box"]]) {
  installer.install(plugin, await loader.manifest(fileURLToPath(new URL(`../../src/plugins/${path}/package.json`, import.meta.url))));
}
await new CliRepl(assembly.dispatcher, assembly.createSession()).run();
