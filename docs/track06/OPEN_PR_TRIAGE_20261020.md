# TRACK 06 — All open PR inventory and overlap triage

Snapshot: 2026-10-20. Repository: moaz76943-creator/zen-study-focus.
Read-only live query returned **46 OPEN pull requests**. Inspected their GitHub changed-filename sets (not a claim that every patch is logically validated); exact ancestry and two exact blob hashes were checked where indicated.

The following groups are exhaustive and mutually exclusive; status means **review disposition**, not GitHub issue state. No PR was merged, closed, converted from Draft, or edited in this phase.

| PR numbers | Review classification | Action |
|---|---|---|
| #70 | CANDIDATE—P0 NOT FULLY CLOSED | TRACK00 durability and exact-SHA source. No cross-PR code merge. |
| #66, #52, #25 | ANCESTOR—DO NOT REAPPLY | Git compare verifies PR head is ancestor of 3ab4ebd. Keep branch/PR records; do not cherry-pick. |
| #68 | CONTENT DUPLICATE—DO NOT REAPPLY | Both changed blobs byte-identical to candidate, though PR history diverged. |
| #71 | SECURITY BLOCKED | Gitleaks potential key finding; isolated private classification first. |
| #67, #65, #59, #37, #34, #32, #31, #30, #29, #27, #26, #24, #17, #16, #15, #14, #8 | INDEPENDENT PROPOSALS—ASSESS AFTER P0 | Review their isolated tools, QA, UX/media; overlap may exist. No automatic inclusion. |
| #50, #47, #44, #40, #39, #38, #36, #35, #33, #28, #23, #22, #21, #20, #19, #18, #7, #6, #5, #4, #3, #2, #1 | APPLICATION / QA OVERLAP—HUNK & CONTRACT AUDIT | Older application, locale, audio-picker, UX and QA proposals; overlapping paths not proof of missing functionality. |

## Conflict hot spots (shared file ownership)
| File / scope | Overlapping PR examples | Guarded decision |
|---|---|---|
| android/app/src/main/assets/web/app.js | #70 #66 #44 #47 #40 #39 #35 #25 #1 | Integration owner only; semantic diff of latest candidate vs requested hunk |
| android/app/src/main/assets/web/index.html | #66 #44 #40 #39 #33 #28 #25 #1 | Validate script ordering; never replace with old index |
| android/app/src/main/java/com/zenstudy/focus/MainActivity.java | #70 #66 #44 #39 #25 #1 | Track00 native durability takes precedence; no pre-P0 overwrite |
| android/app/src/main/assets/web/integration_v22.js | #70 #66 #44 #40 #39 #36 #33 #28 #25 #1 | Preserve durable ACK and six-slot journal |
| android/app/src/main/assets/web/tasks_studio.js | #70 #36 #25 #23 #4 | Must preserve failed-write semantics and Undo |
| android/app/src/main/assets/web/notes_editor_ui.js | #70 #66 #44 #40 #25 #21 #7 | Prevent draft loss, long-note reader hiding and keyboard regressions |
| .github/workflows/verify_draft_20_locales.yml | #70 #68 #66 #47 #44 | #68 contents already identical in #70; no double application |
| tests/android_e2e_recovery/** | #70 #66 #52 #50 #38 #30 | Keep 20-case status accurate; unrun cases NOT_TESTED |
| docs/control-center/** | #37 #66 #44 #25 | #37 repo-sync-core is missing from selected snapshot; cherry-pick only after targeted review |
| tools/nature_audio/** and sounds | #59 #26 #25 #17 | Keep quarantined; rights, decode and listening gates separate |

## Verified ancestry / content comparisons
- #25, #52, #66 exact HEADs are ancestors of candidate 3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8 (compare_commits, ahead > 0, behind = 0).
- #68 is divergent as commit graph, BUT both of its changed files have exactly the same blob SHA at #70. Historical infra repair therefore already exists.
- #59 and #37 are divergent in graph. #37 repo-sync-core.js is absent at #70; no invented containment.
- Other PRs were screened by filenames and GitHub descriptions, **not** verified as ancestor, redundant or conflict-free. A future integrator must do exact-SHA three-way patch checks and runtime behavior comparisons before changing code.

## Queue safety
All 46 PRs remain open. No safe-merge labels, automatic closing, branch retargets, force pushes, broad rewriting of old files or changes to main are authorized. First close the P0 durability acceptance gap documented in SAFE_INTEGRATION_GATE_20261020.md, then requery current PRs and reconfirm drift; a 2026-10-20 inventory expires as soon as any head moves.
