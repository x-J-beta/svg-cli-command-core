import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

class MetricsReport {
  #ts;
  #root;

  constructor() {
    this.#root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const require = createRequire(import.meta.url);
    let compiler = process.env.TYPESCRIPT_MODULE;
    if (!compiler) {
      try { compiler = require.resolve("typescript"); }
      catch {
        const launcher = execFileSync(process.platform === "win32" ? "where.exe" : "which", ["code"], { encoding: "utf8" }).trim().split(/\r?\n/u)[0];
        const installation = resolve(dirname(launcher), "..");
        compiler = [installation, ...readdirSync(installation).map((item) => join(installation, item))]
          .map((path) => join(path, "resources/app/extensions/node_modules/typescript/lib/typescript.js"))
          .find((path) => existsSync(path));
      }
    }
    if (!compiler) throw new Error("Set TYPESCRIPT_MODULE to the TypeScript compiler API module");
    this.#ts = require(compiler);
  }

  git(args) { return execFileSync("git", args, { cwd: this.#root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }

  measure(ref) {
    const commit = this.git(["rev-parse", "--verify", `${ref}^{commit}`]).trim();
    const files = this.git(["ls-tree", "-r", "--name-only", commit]).trim().split("\n")
      .filter((path) => /^(src|vscode-extension\/src)\/.*\.ts$/u.test(path) && !path.endsWith(".d.ts"));
    return { commit, files: files.map((path) => {
      const text = this.git(["show", `${commit}:${path}`]);
      const source = this.#ts.createSourceFile(path, text, this.#ts.ScriptTarget.Latest, true);
      let complexity = 0;
      const ts = this.#ts;
      const visit = (node) => {
        if (ts.isFunctionLike(node) && node.body) complexity++;
        if (ts.isIfStatement(node) || ts.isConditionalExpression(node) || ts.isCaseClause(node) ||
            ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) ||
            ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isCatchClause(node)) complexity++;
        if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) complexity++;
        ts.forEachChild(node, visit);
      };
      visit(source);
      const category = path.startsWith("vscode-extension/") ? "vscode"
        : path.startsWith("src/plugins/") ? "plugins"
        : /^(src\/host\/|src\/cli\/|src\/infrastructure\/|src\/main\.ts|src\/index\.ts)/u.test(path) ? "assembly" : "kernel";
      const title = source.statements.find((node) => ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node));
      const name = title?.name?.text ?? "module";
      const responsibility = path.endsWith("/index.ts") || path === "src/index.ts" ? "Expose the public module API"
        : path.startsWith("src/host/") ? "Compose or load runtime dependencies and plugin instances"
        : /CliCommand$/u.test(name) ? "Validate CLI arguments and invoke the corresponding use case"
        : /Command$/u.test(name) ? "Execute a command and enforce its edit or query contract"
        : /Provider$/u.test(name) ? "Create or restore shapes through the provider contract"
        : /Handler$/u.test(name) ? "Apply domain attribute behavior through the edit transaction"
        : /Decorator$/u.test(name) ? "Supply optional tree-line tags"
        : /Plugin$/u.test(name) ? "Register the package contributions"
        : path.startsWith("src/application/plugins/") ? "Define plugin contracts or read-only application views"
        : path.startsWith("src/domain/") ? "Encapsulate shape, geometry, containment or document invariants"
        : path.startsWith("src/infrastructure/") ? "Adapt XML or file storage to the application"
        : path.startsWith("src/plugins/") ? "Implement the package domain behavior or filesystem port"
        : path.startsWith("vscode-extension/") ? "Provide SVG outline or decoration behavior to VS Code"
        : path.startsWith("src/cli/") ? "Adapt terminal input or output"
        : "Coordinate editor state, command history or presentation";
      return { path, category, responsibility: `${name}: ${responsibility}`,
        lines: text.trimEnd().split("\n").length, complexity };
    }) };
  }

  run(args) {
    const [base = "final", target = "HEAD", output = "docs/metrics", label = target] = args;
    const before = this.measure(base);
    const after = this.measure(target);
    const categories = ["kernel", "assembly", "plugins", "vscode"];
    const totals = (files, category) => files.filter((file) => file.category === category)
      .reduce((sum, file) => ({ files: sum.files + 1, lines: sum.lines + file.lines,
        complexity: sum.complexity + file.complexity }), { files: 0, lines: 0, complexity: 0 });
    const summary = categories.map((category) => {
      const previous = totals(before.files, category);
      const current = totals(after.files, category);
      return { category, before: previous, after: current, complexityDelta: current.complexity - previous.complexity };
    });
    const directory = resolve(this.#root, output);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "report.json"), JSON.stringify({ base, target: label, baseCommit: before.commit,
      baseSourceTree: this.git(["rev-parse", `${before.commit}:src`]).trim(),
      targetSourceTree: this.git(["rev-parse", `${after.commit}:src`]).trim(),
      method: "Physical non-trailing lines; AST function bases + branch/loop/catch/short-circuit decisions; VS Code excluded from CLI totals.",
      summary, files: after.files }, null, 2) + "\n");
    writeFileSync(join(directory, "files.csv"), "category,path,responsibility,lines,complexity\n" +
      after.files.map((file) => [file.category, file.path, file.responsibility, file.lines, file.complexity]
        .map((value) => '"' + String(value).replace(/"/gu, '""') + '"').join(",")).join("\n") + "\n");
    console.log(JSON.stringify({ baseCommit: before.commit, targetCommit: after.commit, summary }, null, 2));
  }
}

new MetricsReport().run(process.argv.slice(2));
