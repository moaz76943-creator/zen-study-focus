# Phase 1 canonical integration baseline and evidence

Date: 2026-10-20 UTC. DF-CX-001–004. This document supplements the existing `LEDGER_197.json`; it does not replace Issue #13 or create another task ledger.

## Selected source and protected work

BASE_SHA: `bd6e3e4d8aef95def871c9e7f78c63807e681369` (PR #66).
Repair branch: `fix/codex-phase1-stabilization-20261020`, isolated worktree `/workspace/deep-focus-phase1`.
Default branch remains `main`; no production merge authorized. Original worktrees remain intact, including local unpublished `e3394e8d6c4be4e11204ea2e435e9a8f4e74dbde` and its generated untracked reports. The selected source has two parents, PR #52 `534912c` and PR #25 `be890c7`.

## Live ancestry, not PR status inference

| PR | State | Live head | Base | Head ancestor of candidate |
|---|---|---|---|---|
| #68 | open | `fa376026c8f53989f8bbced851ea6b1b5ed010d7` | integration/deep-focus-consolidated-candidate-20261020 | no (compare content) |
| #67 | open | `e6ad2811302bea8333207b6d11dba0cb0a3cc70c` | main | no (compare content) |
| #66 | open | `bd6e3e4d8aef95def871c9e7f78c63807e681369` | integration/deep-focus-recovery-00-final-20261019 | yes |
| #65 | open | `9ca2fb40ae9db6bd823415dd2415f0750c779ede` | main | no (compare content) |
| #59 | open | `5c74816692c971f6d0493475a2d856018cf72021` | integration/deep-focus-recovery-00-final-20261019 | no (compare content) |
| #52 | open | `534912ce2d90d8988981c7d32e8bcb69671003f0` | fix/master-completion-20261020 | yes |
| #50 | open | `639257bf3b8b392f1fdd512fc72b7656fd9ad9fa` | fix/master-completion-20261020 | no (compare content) |
| #47 | open | `163cc0a83be8219f929f0c6907c8da85a0f33e49` | fix/master-completion-20261020 | no (compare content) |
| #44 | open | `93aa1be5dd3fcc08027b5ffe9fd03d6b5e250b09` | integration/deep-focus-recovery-00-final-20261019 | no (compare content) |
| #42 | closed | `aa7bd63ce45a0174c9091472d251d81cd3d30492` | integration/df4-consolidated-qa-20261019 | yes |
| #41 | closed | `d8430d6a5bb932143cad9cb95a9b9b81f5a0a911` | fix/df4-master-recovery-20261019 | yes |
| #39 | open | `96732c84cda2dd52f52cc6de06c22e59b1f1bd2b` | integration/deep-focus-recovery-00-final-20261019 | no (compare content) |
| #25 | open | `be890c7487ba042af12b764a1a211fe7beed2a4e` | fix/v21-safe-release-recovery-20261018 | yes |

PR #42's closed/unmerged GitHub state does not mean missing code: its head is an ancestor. Latest #44/#47 heads are not ancestors, but actual runtime source diff against #44 contains only candidate additions (Nature V2 and Notes/IME CSS). The activity-counter durability, failed-language rollback and 20-language draft warning tests/code already exist. Do not cherry-pick those merge commits. PR #52 contains existing ADB touch geometry and keyboard diagnostics; reuse them. PR #59 audio QA is separate from approved primary-package playback. #65 orchestration and #67 read-only merge probes are existing work, not missing tools to recreate.

## Exact candidate baseline results

- Local UNIT/INTEGRATION/static Node discovery: **561 PASS, 0 FAIL**, media release gate deliberately separate, not disabled. Command: `find tests -type f \( -name '*.test.cjs' -o -name 'test_*.cjs' \) ! -name media_provenance_gate.test.cjs -print0 | sort -z | xargs -0 -r node --test --test-reporter=tap`.
- CI source + Gradle: [39360536754](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39360536754) SUCCESS on BASE_SHA.
- BROWSER: [39360536643](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39360536643) SUCCESS on BASE_SHA.
- ANDROID_EMULATOR API30: [39360536718](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39360536718) workflow FAILURE; CDP cases **13 PASS / 0 FAIL / 7 NOT_TESTED**; UIAutomator HTML-descendant transport **20 NOT_TESTED**. A 1-minute background work-credit assertion passed, notification appearance/hearing/DND did not run. Never call all Android acceptance passed.
- Draft locale CI [39360589209](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39360589209): source SUCCESS, debug build **FAIL_TEST_INFRA** (`sdkmanager: command not found` before compilation). #68 fixes this exact setup failure and has source/debug SUCCESS; review its two-file patch before integration.
- Physical installed owner APK, signing and installed source identity unavailable: **DEVICE_NOT_TESTED**. Historical checked-in APK is not evidence of this source. No owner data accessed.

## Contracts and feature ownership

Read `DATA_COMPAT_V21.md`, `MEDIA_LICENSES.md`, `LEDGER_197.md/.json`, `FINAL_MATRIX_161.md`, and live Issue #13 (full body captured with its updated timestamp). Historical contract text describing a standalone module is superseded by current integrated preflight/journal code: preserve actual six-slot primary/mirror envelopes and transaction verification.

`cfg.sessions` remains numeric; `cfg.sessionHistory` is the history array. Numeric task/note IDs and unknown fields must survive. Keep all protected v21 keys, draft/active-timer keys, local WebView origin and `ZEN21::`. No migration, permissions, signing or package-ID change.

Features retained: timer/native ledger, tasks/projects/subtasks/calendar, Notes/editor/drafts/linking, analytics/goals/CSV/backup, quick training, 20 languages, current gated nature mixer plus non-activating Nature V2 inventory. Existing adapters deliberately bridge core modules into legacy state; file-name similarity is not proof of duplicate active ownership.

## Runtime script graph (actual index order)

1. `webview_compat.js`
2. `locale_rows.js`
3. `locale_extras.js`
4. `numerals_ascii_v21.js`
5. `quick_training.js`
6. `data_compat_v21.js`
7. `preflight_v22.js`
8. `nature_library_v2.js`
9. `analytics_recovery_core.js`
10. `app.js`
11. `notes_core_v21.js`
12. `notes_studio.js`
13. `notes_editor_ui.js`
14. `notes_drafts.js`
15. `tasks_core_v21.js`
16. `tasks_studio.js`
17. `analytics_core_v21.js`
18. `analytics_studio.js`
19. `localization_20_recovery.js`
20. `analytics_recovery_ui.js`
21. `analytics_recovery_ar_locale.js`
22. `interaction_recovery_06.js`
23. `completion_alert_settings.js`
24. `completion_alert_locales.js`
25. `locale_premium_v22.js`
26. `goals_studio.js`
27. `timer_settings.js`
28. `sound_mix_controls.js`
29. `integration_v22.js`

`webview_compat` precedes application mounts; canonical recovery analytics precedes legacy app/core; studio modules load before integration adapters. `integration_v22.js` mounts existing studios and owns journaled cross-family commits. No parallel registry is introduced.

## Test inventory and remaining evidence

Discovered source test files: 97. Existing browser suites live in `tests/df4_browser/`; actual emulator transport in `tests/android_e2e_recovery/`; JVM native ledger/document writer tests are distinct from Android execution. Source baseline log retained under `/workspace/scratch/phase1-evidence/baseline-node.tap`; live GitHub logs and branch/PR snapshots are in `/workspace/scratch/phase1-*`.

Release remains **RELEASE_APPROVED=NO**: required Android scenarios, physical device, native notification/audio routes, complete 20-language rendered parity and recording provenance/listening clearance remain open. Existing #66 Nature V2 is inventory only; no new recording activation allowed.

## Proven remaining defect selected for next patch

`tasks_studio.js` accepts a synchronous `false`/undefined commit as success in `apply` and Undo/Redo, and unconditional refresh loses undo history even when external state is unchanged. Candidate has older code than the protected local task patch; re-run the negative tests against this candidate before applying only reviewed task hunks. Primary/mirror and backup implementations remain untouched.

## Batch 01 — task persistence and bounded rendering

Root cause: `TasksStudio.apply` and Undo/Redo accepted every synchronous result, including `false`, then published next state and cleared the editor. `refresh` also discarded Undo unconditionally. The protected local e3394e8 task-only patch was reviewed against the exact candidate (identical original task source), rather than copying old app/index files.

RED: three new candidate tests failed: silent false commit published a task; unchanged refresh lost Undo; 1,001 matches created 1,001 cards. GREEN: **37/37 Tasks tests**, including strict commit acknowledgment, retained form on failure, Undo preserved on equal snapshot but invalidated by external timer credit, and 100-card initial rendering/More/search across all 1,001 preserved records. Existing test adapter now returns `true` exactly as the production journal adapter does.

Cross-regression: **51/51** v21 contract, mirror/journal, backup round-trip/failure, timer durable credit and Notes draft tests passed. No storage engine, key, ID, schema, unknown field, session-credit or media policy changed. Android on this patch: **NOT_TESTED**; physical device **DEVICE_NOT_TESTED**. Source tests do not prove actual storage hardware durability.

Commands: `node --test --test-reporter=tap tests/tasks_core/*.test.cjs tests/tasks_recovery/*.test.cjs`; `node --test --test-reporter=tap tests/data_contracts/*.test.cjs tests/integration_recovery/restore_journal.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/notes_recovery/*.test.cjs`.

## Batch 02/03 — preserve timer implementation and improve Android evidence

Reviewed existing timer credit and native token ledger. Session history already checks IDs beyond the 300-ID JS cache; existing durable journal retry tests pass. Native notification dedupe remains bounded (128 tokens), so permanent historical exactly-once notification behavior, wall-clock change and hardware routes are **not claimed**. No timer coordinator/schema rewrite was made.

Adopted existing #52 ADB/WebView geometry pipeline. Improved its existing result evidence: retain each actual ADB tap coordinate, selector, hit target, CSS viewport and physical WebView bounds; label ADB taps separately from CDP text injection. Previously successful navigation discarded those coordinates. Add a separate failure classification without changing legacy PASS/FAIL/NOT_TESTED counts or the strict non-PASS exit gate: assertion/visible geometry failure `FAIL_APP`, transport/protocol failure `FAIL_TEST_TRANSPORT`, unavailable prerequisites `BLOCKED`, unidentified or injected-evaluation failure `FAIL_TEST_INFRA`. An exception from a test expression alone does not prove the human flow fails.

RED/GREEN: new classification test initially failed (function absent); **25/25** existing Android harness Node tests pass after the scoped change. This is UNIT evidence, not Android execution. Existing 7 unimplemented device scenarios remain NOT_TESTED. #68 SDK discovery patch retained original author as commit `fc6ef41`; its 2 source contracts pass, final combined Debug build still pending.

## Follow-up root cause — production adapter snapshot order

The first broader source/Gradle run on `79d175c` passed 567 tests and built APK SHA256 `77ead81d4d5c58961ccb0341c39f5587557aaaca96d40e8b4dcf8e16631a315c` (artifact 12238067319, run 39363017887). That APK is **superseded**, not the final repair binary.

An additional real-browser journey exposed that Undo still disappeared after tab return. First test attempt failed because its secondary action menu was closed (test setup); after opening the actual menu, the application assertion failed: completion remained true after Undo. Repeated-navigation snapshots were byte-identical. Root cause: core `stateCopy` constructs `{tasksList,cfg}` while the real adapter reconstructs `{cfg,tasksList}`. Existing unit mocks returned core key order and hid the bug. A JSON-string comparison is order-sensitive at the top level.

RED: changed the unit mock to the exact real adapter read shape; **3/10** task UI tests failed. FIX: compare the two owned snapshot fields in explicit fixed order, preserving all nested fields/data, without changing persisted schema. GREEN: **37/37** task tests; **26/26** real Chromium completion checks, now including actual task completion -> 10 tab returns -> More -> Undo, and real task journal quota failure retaining state/input. The second run is justified by this reproduced application bug, not a blind retry. This supersedes the narrower initial Undo claim. Native timer, audio and storage formats untouched.

The existing canonical ledger contains the follow-up code commit. Final source/browser/Android checks must target the subsequent documentation head, not the superseded APK above. Physical device remains DEVICE_NOT_TESTED. Localization audit on 79d175c: **4608** missing catalog language/key pairs across 20 languages; the follow-up changes no locale strings. Media gate remains 1 PASS / 2 FAIL.
