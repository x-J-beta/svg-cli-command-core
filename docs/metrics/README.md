# CLI metrics

Reports are generated from committed source by `tools/MetricsReport.mjs`. Each report contains a JSON summary and a CSV file list with responsibilities, line counts and complexity.

- `framework/` compares `final` with the framework registration/configuration milestone.
- `current/` compares `final` with the current implemented CLI.
- `history-sessions.json` records execution of the `final` CLI and the independent code-assembly box demonstration against fixed expected output.

Run from repository root.

```powershell
node tools/MetricsReport.mjs final HEAD docs/metrics/current
node tools/VerifyPluginChanges.mjs
node tools/VerifyHistorySessions.mjs
```

The history session checker uses built worktrees at `.tools/phase1-final` and `.tools/box-code-demo`. To reproduce on another checkout, create the first worktree from `final`, create the second from `codex/box-code-demo`, and compile both with `tsc -p tsconfig.json` using the project's prepared dependencies. Obtain the demonstration branch from the same remote repository when reproducing elsewhere.

The metrics generator resolves all refs to commits and reads files using Git. CLI files are grouped as kernel, assembly and plugins. VS Code extension source is reported separately. Dependencies, generated files, tests and documentation are excluded. Physical lines include comments and internal blank lines, excluding trailing blank lines. Complexity counts a base for each implemented function/method plus branches, loops, catches and short-circuit expressions. This is the same calculation for both refs.

The JSON report records the compared source tree identifiers. Once all submission evidence is complete and `p2` exists, regenerate with `final p2 docs/metrics/p2`. The immutable tag belongs on the final submission commit.
