import type { ShapeProvider } from "../../domain/ShapeProvider.js";
import { ShapeFactory } from "../../domain/ShapeFactory.js";
import type { AttributeHandler } from "./AttributeHandler.js";
import type { Command } from "./Command.js";
import type { Plugin } from "./Plugin.js";
import type { TreeDecorator } from "./TreeDecorator.js";
import type { PluginManifest } from "./PluginManifest.js";

export class ExtensionRegistry {
  readonly #shapes = new Map<string, ShapeProvider>();
  readonly #commands = new Map<string, Command>();
  readonly #decorators = new Map<string, TreeDecorator>();
  readonly #attributes = new Map<string, AttributeHandler>();
  #activating = false;
  readonly factory = new ShapeFactory((type) => this.shape(type));

  get commands(): readonly Command[] { return [...this.#commands.values()]; }
  get decorators(): readonly TreeDecorator[] { return [...this.#decorators.values()]; }
  get attributes(): readonly AttributeHandler[] { return [...this.#attributes.values()]; }
  command(name: string): Command | undefined { return this.#commands.get(name); }
  shape(name: string): ShapeProvider | undefined { return this.#shapes.get(name); }

  activate(plugin: Plugin, options?: unknown, manifest?: PluginManifest): void {
    if (this.#activating) throw new Error("plugin activation is already in progress");
    const shapes = new Map<string, ShapeProvider>();
    const commands = new Map<string, Command>();
    const decorators = new Map<string, TreeDecorator>();
    const attributes = new Map<string, AttributeHandler>();
    let registrationFailure: { cause: unknown } | undefined;
    let open = true;
    const stage = <T extends { readonly name: string }>(
      category: string, published: ReadonlyMap<string, T>, pending: Map<string, T>, entry: T, methods: readonly (keyof T)[],
      valid: (entry: T) => boolean = () => true,
    ): void => {
      if (!open) throw new Error("plugin registration is closed");
      try {
        const name = entry?.name;
        if (typeof name !== "string" || name.trim() === "" || /\s/u.test(name)) {
          throw new Error(`invalid registration name: ${category}`);
        }
        if (published.has(name) || pending.has(name)) throw new Error(`duplicate registration: ${category}/${name}`);
        if (methods.some((method) => typeof entry[method] !== "function") || !valid(entry)) {
          throw new Error(`invalid registration: ${category}/${name}`);
        }
        pending.set(name, entry);
      } catch (cause) {
        registrationFailure ??= { cause };
        throw cause;
      }
    };
    this.#activating = true;
    try {
      const result: unknown = plugin.activate({
        registerShape: (entry) => stage("shapes", this.#shapes, shapes, entry, ["create", "fromSvg"]),
        registerCommand: (entry) => stage("commands", this.#commands, commands, entry, ["execute"],
          (command) => typeof command.syntax === "string" && command.syntax.trim() !== ""),
        registerDecorator: (entry) => stage("decorators", this.#decorators, decorators, entry, ["decorate"]),
        registerAttribute: (entry) => stage("attributes", this.#attributes, attributes, entry, ["handles", "apply"]),
        createShape: (type, id, args) => this.factory.fromArguments(type, id, args),
      }, options);
      if (result !== undefined) {
        void Promise.resolve(result).catch(() => undefined);
        throw new Error("plugin activation must complete synchronously");
      }
      if (registrationFailure) throw registrationFailure.cause;
      if (manifest) {
        const declared = manifest.contributes ?? {};
        const registered = { shapes: [...shapes.keys()], commands: [...commands.keys()],
          decorators: [...decorators.keys()], attributes: [...attributes.keys()] };
        const categories = ["shapes", "commands", "decorators", "attributes"] as const;
        const expected = Object.fromEntries(categories.map((category) => [category, [...(declared[category] ?? [])].sort()]));
        const actual = Object.fromEntries(categories.map((category) => [category, registered[category].sort()]));
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          throw new Error(`plugin manifest mismatch: ${manifest.name} (declared: ${JSON.stringify(expected)}, registered: ${JSON.stringify(actual)})`);
        }
      }
      for (const [name, entry] of shapes) this.#shapes.set(name, entry);
      for (const [name, entry] of commands) this.#commands.set(name, entry);
      for (const [name, entry] of decorators) this.#decorators.set(name, entry);
      for (const [name, entry] of attributes) this.#attributes.set(name, entry);
    } finally {
      open = false;
      this.#activating = false;
    }
  }
}
