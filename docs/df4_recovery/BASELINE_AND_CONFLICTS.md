# DF4 batch 0 — live baseline, 2026-10-19

Base: `0dd9239bc28978e11f41c1c0f618c9662b291fe2` (PR #25).
Branch: `fix/df4-master-recovery-20261019`.
Worktree: `/workspace/deep-focus-df4`; original clone `/workspace/zen-study-focus` remains on main, clean. No prior local edits existed. Remote branch tips are in LIVE_PR_SNAPSHOT.json (all PRs #1–#32, excluding issue #13). Full issue, PR bodies, comments, review comments and file lists were retrieved to `/workspace/scratch/df4-baseline` (issue #13 separately in scratch). No force push, reset, production merge or user data access.

Read contracts/DATA_COMPAT_V21.md, QA_08_RELEASE_AUDIT_20261019.md, recovery_integration/FINAL_MATRIX_161.md and master_recovery_qa/MASTER_MATRIX_161.md. Existing ledger counts are historical source evidence, not Android completion. Preserve all v21 keys, numeric note/task IDs, opaque session IDs, unknown fields, packet format, ZEN21:: and application ID.

## Conflict disposition

| Work | Overlap / decision |
| --- | --- |
| #1–#11 | #9 and #11 merged into recovery, absent from current main; #10 superseded. Preserve integration baseline. |
| #12 | Reject blanket integration: suppresses ar/fa/ur; inspect useful audio findings separately. |
| #14–#25 | Existing integrated/reviewed module work retained; no overwrite from old specialist heads. |
| #17, #26 | Unproven original-to-derived media chain; no runtime activation. earth is HVAC, missing night/waterfall excluded. |
| #27 | New isolated security tests/docs; import for reproduction before narrow fixes. |
| #28 | Shared index.html, integration_v22.js, analytics UI and CSS: compare against exact integration SHA; scoped transfer with tests, no blind merge. Translation tables do not fix absent picker CSS. |
| #29 | Isolated performance fixtures and utilities; utilities remain opt-in until integration review. |
| #30 | Isolated E2E inventory; Android scenarios stay NOT_TESTED without adb/device. |
| #31 | In-memory prototype; never replace persistent production UI with it. |
| #32 | Read-only audit tools; re-run against modified source, keep translation gaps visible. |

## APK discrepancy

#25 HEAD is 0dd9239; #28 HEAD is bb47125 and is NOT an ancestor of #25. #28 CI run 39228175125 builds only its own SHA. Main remains fab0b8b and the checked-in app-release.apk is a separate historical artifact. These are demonstrably different source/build paths. Installed APK hash/version and phone/WebView metadata are unavailable: its exact source cannot be determined remotely. No claim that screenshots prove installation of a particular SHA.

## Environment and limits

Node, Python, Java and gh available. No adb command or attached phone established; no Android SDK detected in standard location. Android tests NOT_TESTED. Do not clear device data, obtain/upload real backups, sign production or merge into main. Debug CI on final SHA is allowed; separate human review remains required for merge/release.
