import type { PluginInstaller } from "./PluginInstaller.js";
import type { PluginLoader } from "./PluginLoader.js";
import stats from "../plugins/stats/StatsPlugin.js";
import directory from "../plugins/dir/DirPlugin.js";
import { fileURLToPath } from "node:url";

/** Composition root for optional plugins; this is the only file code assembly changes. */
export class CodePlugins {
  async activate(installer: PluginInstaller, loader: PluginLoader): Promise<void> {
    installer.install(stats, await loader.manifest(fileURLToPath(new URL("../../src/plugins/stats/package.json", import.meta.url))));
    installer.install(directory, await loader.manifest(fileURLToPath(new URL("../../src/plugins/dir/package.json", import.meta.url))));
  }
}
