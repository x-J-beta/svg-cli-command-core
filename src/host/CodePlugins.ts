import type { PluginInstaller } from "./PluginInstaller.js";
import type { PluginLoader } from "./PluginLoader.js";

/** Composition root for optional plugins; this is the only file code assembly changes. */
export class CodePlugins {
  async activate(_installer: PluginInstaller, _loader: PluginLoader): Promise<void> {}
}
