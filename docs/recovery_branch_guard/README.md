# Deep Focus branch-consolidation evidence

The 2026-10-20 recovery contains two long-lived source histories:

- `integration/deep-focus-recovery-00-final-20261019` — PR #25, original 161-task integration.
- `fix/df4-notes-save-visible-android-20261020` — includes PR #52 Android improvements and PR #61 note Save fix; PR #61 merged into #52 on 2026-10-20.

Do not fast-forward, reset, cherry-pick the old `app.js` wholesale, or merge directly to production without reconciling these histories. The parent branch PR #52 is DRAFT and has NOT been signed off for release.

The CI workflow `.github/workflows/recovery_merge_probe.yml` fetches exact observed SHAs for both active branches. `tools/recovery_branch_guard/merge_probe.cjs` uses `git merge-base`, symmetrical change inventories, and **`git merge-tree --write-tree`** to calculate a three-way merge result without checking out, committing, or pushing a combined app. The JSON/Markdown artifact records exact commit IDs, changed files on each side, overlap requiring review, and Git conflict diagnostics. A success-status workflow means the report itself was produced, **not** that integration or production approval was granted. File overlap alone does not imply a conflict and unshared filenames do not guarantee behavioral compatibility.

To finish integration, inspect `report.md` and `report.json` from the latest SHA-bound run; resolve any conflicting files by minimal content-aware patches in an isolated candidate branch, preserving both branches' features and histories. Then rerun all Node, Python, Android, Chromium, provenance and 20-language workflows **at the same combined SHA**. Keep `FAIL` and `NOT_TESTED` distinct. User backup restore, permission gates, commercial audio licensing and actual human/device acceptance remain separate blockers.

No source modification, repository mutation, automatic merge, Android signing, Play deployment, credential access or user-record inspection is performed by this probe. It is safe to run repeatedly as other agents continue to update review branches.
