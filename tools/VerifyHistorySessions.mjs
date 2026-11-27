import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

class VerifyHistorySessions {
  run() {
    const root = resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
    const checks = [
      ["final", ".tools/phase1-final", "cli-1", []],
      ["codex/box-code-demo", ".tools/box-code-demo", "cli-box", ["--plugins"]],
    ];
    const evidence = [];
    for (const [ref, directory, transcript, args] of checks) {
      const checkout = resolve(root, directory);
      const commit = execFileSync("git", ["rev-parse", `${ref}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
      const checkedOut = execFileSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8" }).trim();
      if (checkedOut !== commit) throw new Error(`Wrong checkout for ${ref}`);
      const fixture = mkdtempSync(join(root, ".svg-editor-test-history-"));
      try {
        mkdirSync(join(fixture, "docs"));
        writeFileSync(join(fixture, ".hidden"), "");
        copyFileSync(join(root, "examples/other.svg"), join(fixture, "other.svg"));
        const result = spawnSync(process.execPath, [join(checkout, "dist/main.js"), ...args],
          { cwd: fixture, input: readFileSync(join(root, "doc/transcript", transcript + ".txt")), encoding: "utf8" });
        if (result.status !== 0) throw new Error(result.stderr);
        for (const stream of ["stdout", "stderr"]) {
          const expected = readFileSync(join(root, "doc/transcript", `${transcript}.${stream}.txt`), "utf8");
          if (result[stream] !== expected) throw new Error(`${ref} ${stream} differs from the fixed expectation`);
        }
        evidence.push({ ref, commit, transcript, stdout: "identical", stderr: "identical" });
      } finally {
        if (dirname(fixture) !== root) throw new Error("Unexpected fixture path");
        rmSync(fixture, { recursive: true, force: true });
      }
    }
    mkdirSync(join(root, "docs/metrics"), { recursive: true });
    writeFileSync(join(root, "docs/metrics/history-sessions.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify(evidence, null, 2));
  }
}

new VerifyHistorySessions().run();
