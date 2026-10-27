# Deep Focus — Critical Room 7 (Codex fallback)

Dedicated **Termux + OpenCode** room for critical work left open while Codex is stalled. Uses only the official base `integration/master-qa-verified-v21`. The branch `support/critical-room7-20261027` is for installing tooling only; it is not a release branch.

**15 tasks in three isolated lanes:**
- **N01–N04**: Native v21 ACK, Android alarm lifecycle, WebChromeClient, Android APK SHA verification.
- **W01–W05**: Notes/Tasks recovery, offline vault correctness, contextual translation, SAF CSV, Quick Training.
- **Q01–Q06**: API30/API35 evidence, Native ACK/WAL matrix, Gitleaks/CodeQL, RTL/digits, audio provenance, touch accessibility.

Each task has one owned source path and one focused Node regression test. Sources can be existing application files; worktrees remain separate. Task state is preserved at `$HOME/dfcritical7` and the manifest is the authority for exact scope.

## Install and start
```bash
curl -fsSLo "$HOME/dfcritical7-install.sh" 'https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/support/critical-room7-20261027/tools/critical_room7/install.sh'
printf '%s  %s\n' 'ad05152b8079d1377f1c06dcb67ea75a49787ec56b72e92a6cf3735e1a73cbe1' "$HOME/dfcritical7-install.sh" | sha256sum -c -
bash "$HOME/dfcritical7-install.sh" start
```

## Status, restart
```bash
node "$HOME/dfcritical7/runner.mjs" status
tmux ls
node "$HOME/dfcritical7/runner.mjs" start
```

Names: `dfcritical7-n`, `dfcritical7-w`, `dfcritical7-q`. `start` is idempotent while sessions exist. Worktrees are resumed on subsequent starts, including incomplete files.

After each focused test PASS the runner creates a scoped PR, not a direct push to the official branch. It auto-merges independent, low-risk QA tools if GitHub permits. Native and data/security-sensitive patches remain PRs pending **actual device/security acceptance**, without blocking unrelated tasks. No Android test is fabricated and no main/release changes are made.

If Codex resumes on a specific same source file, reconcile that one file's PR rather than merging both branches blindly. No change here alters manual development, branch protection, or Room 6.

**Proof supplied with this room:** 6 Node unit tests PASS for manifest uniqueness, PR state handling, scoped changes and lanes; mocked tmux double start generated exactly three nonduplicated sessions; mocked installer verified SHA and decoded both payloads. No Termux real execution/Android acceptance claimed yet.
