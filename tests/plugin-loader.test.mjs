import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { CliAssembly } from "../dist/host/CliAssembly.js";
import { PluginInstaller } from "../dist/host/PluginInstaller.js";
import { PluginLoader } from "../dist/host/PluginLoader.js";

async function fixture(t) {
  const directory = await mkdtemp(join(process.cwd(), ".svg-editor-test-loader-"));
  t.after(async () => {
    assert.equal(resolve(directory, ".."), process.cwd());
    assert.ok(basename(directory).startsWith(".svg-editor-test-loader-"));
    await rm(directory, { recursive: true, force: true });
  });
  const assembly = new CliAssembly();
  const errors = [];
  const installer = new PluginInstaller(assembly.extensions, (message) => errors.push(message));
  const loader = new PluginLoader(installer, (message) => errors.push(message));
  const plugin = async (name, body, contributes = { commands: [name] }) => {
    const folder = join(directory, name);
    await mkdir(folder);
    await writeFile(join(folder, "package.json"), JSON.stringify({ name, type: "module", main: "index.js", contributes }));
    await writeFile(join(folder, "index.js"), body);
  };
  const load = async (plugins) => {
    const path = join(directory, "config.json");
    await writeFile(path, JSON.stringify({ plugins }));
    await loader.loadConfig(path);
  };
  return { directory, assembly, installer, loader, errors, plugin, load };
}

const echo = (name) => `export default new class {
  activate(ctx, options) { ctx.registerCommand(new class {
    name = "${name}"; syntax = "${name}"; execute(args) { args.requireCount(0); return [options?.text ?? "ok"]; }
  }); }
};`;

test("L01 config resolves relative modules, preserves options and skips disabled modules", async (t) => {
  const { assembly, errors, plugin, load } = await fixture(t);
  await plugin("echo", echo("echo"));
  await load([{ module: "./absent", enabled: false }, { module: "./echo", options: { text: "configured" } }]);
  assert.deepEqual(errors, []);
  assert.deepEqual(await assembly.dispatcher.execute(["echo"], assembly.createSession()), ["configured"]);
});

test("L02 missing modules and missing default exports report exact errors and continue", async (t) => {
  const { assembly, errors, plugin, load } = await fixture(t);
  await plugin("no-default", "export const value = 1;", {});
  await plugin("echo", echo("echo"));
  await load([{ module: "./absent" }, { module: "./no-default" }, { module: "./echo" }]);
  assert.deepEqual(errors, ["error: plugin not found: ./absent", "error: plugin has no default export: ./no-default"]);
  assert.ok(assembly.extensions.command("echo"));
});

test("L03 manifest mismatch rolls back registrations and preserves prior plugins", async (t) => {
  const { assembly, errors, plugin, load } = await fixture(t);
  await plugin("echo", echo("echo"));
  await plugin("mismatch", echo("wrong"), { commands: ["declared"] });
  await load([{ module: "./echo" }, { module: "./mismatch" }]);
  assert.match(errors[0], /^error: plugin manifest mismatch: mismatch \(declared: /);
  assert.equal(assembly.extensions.command("wrong"), undefined);
  assert.ok(assembly.extensions.command("echo"));
});

test("L04 activation errors discard partially registered commands and allow later plugins", async (t) => {
  const { assembly, errors, plugin, load } = await fixture(t);
  await plugin("broken", echo("broken").replace('}); }', '}); throw new Error("boom"); }'));
  await plugin("echo", echo("echo"));
  await load([{ module: "./broken" }, { module: "./echo" }]);
  assert.deepEqual(errors, ["error: plugin failed to activate: broken (boom)"]);
  assert.equal(assembly.extensions.command("broken"), undefined);
  assert.ok(assembly.extensions.command("echo"));
});

test("L05 duplicate names reject the entire current plugin", async (t) => {
  const { assembly, errors, plugin, load } = await fixture(t);
  await plugin("duplicate", echo("tree"), { commands: ["tree"] });
  await load([{ module: "./duplicate" }]);
  assert.deepEqual(errors, ["error: duplicate registration: commands/tree"]);
  assert.equal(assembly.extensions.command("tree").syntax, "tree [id]");
});

test("L06 invalid config structures and syntax leave only builtins", async (t) => {
  const { directory, assembly, errors, loader } = await fixture(t);
  const path = join(directory, "config.json");
  for (const source of ["{", "{}", '{"plugins":[{"module":"x","enabled":1}]}', '{"plugins":[null]}']) {
    await writeFile(path, source);
    await loader.loadConfig(path);
  }
  assert.deepEqual(errors, Array(4).fill("error: invalid plugin config"));
  assert.equal(assembly.extensions.commands.length, 20);
});

test("L07 dependency and module evaluation failures are activation failures, not missing plugins", async (t) => {
  const { errors, plugin, load } = await fixture(t);
  await plugin("dependency", 'import "./missing-dependency.js"; export default {};', {});
  await plugin("evaluation", 'throw new Error("evaluation failed");', {});
  await load([{ module: "./dependency" }, { module: "./evaluation" }]);
  assert.match(errors[0], /^error: plugin failed to activate: dependency \(/);
  assert.equal(errors[1], "error: plugin failed to activate: evaluation (evaluation failed)");
});

test("L08 package-name resolution follows config-local node_modules", async (t) => {
  const { directory, errors, plugin, load, assembly } = await fixture(t);
  await plugin("echo", echo("echo"));
  await mkdir(join(directory, "node_modules", "local-package"), { recursive: true });
  await writeFile(join(directory, "node_modules", "local-package", "package.json"),
    JSON.stringify({ name: "local-package", type: "module", main: "../../echo/index.js", contributes: { commands: ["echo"] } }));
  await load([{ module: "local-package" }]);
  assert.deepEqual(errors, []);
  assert.ok(assembly.extensions.command("echo"));
});

test("L09 manifest failure rolls back every extension category, freeing all names for a later plugin", async (t) => {
  const { errors, plugin, load, assembly } = await fixture(t);
  const body = `export default new class { activate(ctx) {
    ctx.registerShape(new class { name="fixture"; create() {} fromSvg() {} });
    ctx.registerAttribute(new class { name="fixture"; handles() { return false; } apply() {} });
    ctx.registerDecorator(new class { name="fixture"; decorate() {} });
    ctx.registerCommand(new class { name="fixture"; syntax="fixture"; execute() { return []; } });
  }};`;
  await plugin("invalid", body, {});
  await plugin("valid", body, { shapes: ["fixture"], commands: ["fixture"], decorators: ["fixture"], attributes: ["fixture"] });
  await load([{ module: "./invalid" }, { module: "./valid" }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^error: plugin manifest mismatch: invalid /);
  assert.ok(assembly.extensions.shape("fixture"));
  assert.ok(assembly.extensions.command("fixture"));
  assert.equal(assembly.extensions.attributes.length, 1);
  assert.equal(assembly.extensions.decorators.length, 1);
});

test("L10 package resolution supports import-only exports without using a require-condition fallback", async (t) => {
  const { directory, errors, load, assembly } = await fixture(t);
  const folder = join(directory, "node_modules", "import-only");
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "package.json"), JSON.stringify({
    name: "import-only", type: "module", exports: { import: "./index.js" }, contributes: { commands: ["echo"] },
  }));
  await writeFile(join(folder, "index.js"), echo("echo"));
  await load([{ module: "import-only" }]);
  assert.deepEqual(errors, []);
  assert.ok(assembly.extensions.command("echo"));
});
