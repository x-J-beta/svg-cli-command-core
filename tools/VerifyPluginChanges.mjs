import { execFileSync } from "node:child_process";

class VerifyPluginChanges {
  git(args) { return execFileSync("git", args, { encoding: "utf8" }).trim(); }

  run(refs) {
    const [code = "codex/box-code-demo", config = "codex/box-config-demo"] = refs;
    for (const [mode, ref] of [["code", code], ["config", config]]) {
      const parent = this.git(["rev-parse", `${ref}^`]);
      const commit = this.git(["rev-parse", ref]);
      for (const path of ["src/application", "src/domain", "src/host/PluginLoader.ts", "src/plugins/builtin", "src/plugins/stats", "src/plugins/dir"]) {
        this.git(["cat-file", "-e", `${parent}:${path}`]);
        this.git(["cat-file", "-e", `${commit}:${path}`]);
        if (this.git(["diff", parent, commit, "--", path])) throw new Error(`${mode} changed protected runtime path ${path}`);
      }
      const changes = this.git(["diff", "--no-renames", "--name-status", parent, commit]).split("\n");
      for (const change of changes) {
        const [status, path] = change.split("\t");
        if (!path.startsWith("src/")) continue;
        if (path.startsWith("src/plugins/box/") && status === "A") continue;
        if (mode === "code" && path === "src/host/CodePlugins.ts" && status === "M") continue;
        throw new Error(`Unexpected ${mode} runtime change: ${change}`);
      }
      console.log(`${mode}: ${commit} passed; all protected paths exist and have zero diff`);
    }
  }
}

new VerifyPluginChanges().run(process.argv.slice(2));
