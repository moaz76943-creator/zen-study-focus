# Deep Focus — Room 6 / Hybrid OpenCode

Scope: 24 non-overlapping source/test pairs; 3 independent Termux tmux lanes. The official merge base is `integration/master-qa-verified-v21`. This is a **support branch only** and is not an app release or automatic edit to `main`.

## Install
Use the install.sh in this folder, which downloads runner.mjs and tasks.json from their gzip+base64 payloads, verifies SHA-256, checks the manifest, then starts three sessions. No ZIP / ChatGPT library dependency.

## Lanes
- U01–U08: offline Focus Lab HTML, CSS, i18n, DOM safety, routing, registry and controller. Does **not** touch index.html; any shipped-app entrypoint integration is a separate coordinated change.
- F01–F08: adapters for **actual existing** room3/room5 reading, weekly intentions, projects, sport, study plans, checklists and learning engines. No implicit persistence/timer credits.
- Q01–Q08: optional **read-only** evidence tools (screen inventory, linkage gaps, translation truth, digits, accessibility, offline assets and Android QA status). They do not block manual development.

Each task owns exactly one new source path and one focused Node test; 24 distinct pairs = 48 new files maximum. A task is MERGED only when GitHub accepted the PR. `MODEL_STARTED` or `test passed` alone does not mean a live Android feature.

## On device
```bash
node "$HOME/dfroom6/runner.mjs" status
node "$HOME/dfroom6/runner.mjs" start
tmux ls
tail -n 35 "$HOME/dfroom6/outcomes.tsv"
tail -n 50 "$HOME/dfroom6/logs/U01.log"
```

Three tmux sessions: `dfroom6-u`, `dfroom6-f`, `dfroom6-q`. A second `start` is idempotent while sessions exist; if Android killed tmux, run `start` again. The runner preserves partial worktrees, tries at most two free models when the first has an explicit provider error, and continues independent tasks after a failure. It never force pushes, resets or deletes existing worktrees.

## Merge semantics
For a new task: clone latest official integration source in a lane-specific repo; create a task worktree; ask OpenCode to implement its scoped source and test using RED/GREEN; verify both paths, run `node --test` on the new test; commit and push only the two owned files; create a PR; attempt immediate squash merge with exact expected PR HEAD. GitHub branch protection is not bypassed. A protected/rejected merge remains `PR_PENDING` and **does not halt other tasks**.

For a repeat run: query existing task PR, skip if merged, retry a pending merge, or preserve the partial local worktree and resume. No instructions here change rules for human PRs or manual `git push` actions.

## Explicit boundaries
Do not change `app.js`, `index.html`, `MainActivity.java`, v21 storage, native ACK, Android permissions, media approvals or release configuration in this room. Codex's critical-fix work is independent. Focus Lab integration into shipped navigation remains a subsequent small, coordinated change, not 24 features suddenly available in Google Play.

## Tested before publication
- `node --check runner.mjs`
- runner `selftest`: 24 scoped tasks, no overlapping source or test paths
- mocked Termux install flow: downloaded payload decoding and SHA checks
- mocked tmux `start` twice: 3 sessions started, zero duplicates
- actual GitHub `create_file` blob hashes match the local payloads

These tests do **not** represent real device execution, OpenCode quota availability, future PR merges, or full Android E2E.
