import type { ExtensionRegistry } from "../application/plugins/ExtensionRegistry.js";
import type { Plugin } from "../application/plugins/Plugin.js";
import type { PluginManifest } from "../application/plugins/PluginManifest.js";

export class PluginInstaller {
  readonly #registry: ExtensionRegistry;
  readonly #report: (message: string) => void;
  constructor(registry: ExtensionRegistry, report: (message: string) => void) {
    this.#registry = registry; this.#report = report;
  }

  install(plugin: Plugin, manifest: PluginManifest, options?: unknown): void {
    try { this.#registry.activate(plugin, options, manifest); }
    catch (failure) {
      const reason = failure instanceof Error ? failure.message : String(failure);
      const message = /^(duplicate registration:|plugin manifest mismatch:)/u.test(reason)
        ? reason : `plugin failed to activate: ${manifest.name} (${reason})`;
      this.#report(`error: ${message.replace(/[\r\n]+/gu, " ")}`);
    }
  }
}
