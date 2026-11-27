import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin } from "../application/plugins/Plugin.js";
import type { PluginManifest } from "../application/plugins/PluginManifest.js";
import type { PluginInstaller } from "./PluginInstaller.js";
import { ModuleResolver } from "./ModuleResolver.js";

interface PluginEntry { module: string; enabled?: boolean; options?: unknown; }

export class PluginLoader {
  readonly #installer: PluginInstaller;
  readonly #report: (message: string) => void;
  readonly #resolver = new ModuleResolver();
  constructor(installer: PluginInstaller, report: (message: string) => void) {
    this.#installer = installer; this.#report = report;
  }

  async loadConfig(path: string): Promise<void> {
    const configPath = resolve(path);
    let entries: PluginEntry[];
    try {
      const config: unknown = JSON.parse(await readFile(configPath, "utf8"));
      if (!config || typeof config !== "object" || !("plugins" in config) || !Array.isArray(config.plugins)) throw new Error();
      entries = config.plugins as PluginEntry[];
      if (entries.some((entry) => !entry || typeof entry.module !== "string" || entry.module.trim() === "" ||
        (entry.enabled !== undefined && typeof entry.enabled !== "boolean"))) throw new Error();
    } catch { this.#report("error: invalid plugin config"); return; }
    for (const entry of entries) {
      if (entry.enabled !== false) await this.loadModule(entry, configPath);
    }
  }

  async manifest(packagePath: string): Promise<PluginManifest & { main?: string }> {
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as PluginManifest & { main?: string };
    if (!manifest || typeof manifest.name !== "string" || manifest.name.trim() === "" ||
      (manifest.main !== undefined && typeof manifest.main !== "string")) throw new Error("invalid plugin manifest");
    if (manifest.contributes !== undefined) {
      if (!manifest.contributes || typeof manifest.contributes !== "object") throw new Error("invalid contributes");
      for (const [category, names] of Object.entries(manifest.contributes)) {
        if (!["shapes", "commands", "decorators", "attributes"].includes(category) ||
          !Array.isArray(names) || names.some((name) => typeof name !== "string" || name.trim() === "") ||
          new Set(names).size !== names.length) throw new Error("invalid contributes");
      }
    }
    return manifest;
  }

  private async loadModule(entry: PluginEntry, configPath: string): Promise<void> {
    const require = createRequire(pathToFileURL(configPath));
    let entryPath: string;
    let manifestPath: string;
    try {
      const candidate = entry.module.startsWith(".") || isAbsolute(entry.module)
        ? resolve(dirname(configPath), entry.module) : entry.module;
      if (isAbsolute(candidate) && (await stat(candidate)).isDirectory()) {
        manifestPath = join(candidate, "package.json");
        const manifest = await this.manifest(manifestPath);
        entryPath = require.resolve(resolve(candidate, manifest.main ?? "index.js"));
      } else {
        entryPath = await this.#resolver.resolve(isAbsolute(candidate) ? pathToFileURL(candidate).href : candidate, configPath);
        manifestPath = await this.findManifest(dirname(entryPath));
      }
    } catch (failure) {
      const code = (failure as NodeJS.ErrnoException).code;
      this.#report(code === "ENOENT" || code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND"
        ? `error: plugin not found: ${entry.module}`
        : `error: plugin failed to activate: ${entry.module} (${this.reason(failure)})`);
      return;
    }
    let name = entry.module;
    try {
      const manifest = await this.manifest(manifestPath);
      name = manifest.name;
      // Import evaluation is separate from resolution: dependency failures are activation failures.
      const loaded: { default?: Plugin } = await import(pathToFileURL(entryPath).href);
      if (loaded.default === undefined) { this.#report(`error: plugin has no default export: ${entry.module}`); return; }
      if (typeof loaded.default?.activate !== "function") throw new Error("default export must be a plugin instance");
      this.#installer.install(loaded.default, manifest, entry.options);
    } catch (failure) {
      this.#report(`error: plugin failed to activate: ${name} (${this.reason(failure)})`);
    }
  }

  private async findManifest(directory: string): Promise<string> {
    const candidate = join(directory, "package.json");
    try { await stat(candidate); return candidate; }
    catch (failure) {
      if ((failure as NodeJS.ErrnoException).code !== "ENOENT" || dirname(directory) === directory) throw failure;
      return this.findManifest(dirname(directory));
    }
  }

  private reason(failure: unknown): string {
    return (failure instanceof Error ? failure.message : String(failure)).replace(/[\r\n]+/gu, " ");
  }
}
