# TRACK 07 — Specialist lane handoff matrix (prepared, NOT STARTED)

**Immutable app source baseline:** 3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8 (PR #70).
**Preparation/audit branch:** review/track06-gated-checkpoint-20261020 (docs-only children).
**Stop condition:** Until TRACK00 data-loss P0 is formally closed with Android fault-injection evidence, all specialist app edits/integration must remain suspended. Branch creation and source review do NOT authorize app merges.

| Lane | Scope and allowed primary ownership after unlock | Existing proposals to compare | Minimum acceptance |
|---|---|---|---|
| 07-00 | Android durability / storage: MainActivity.java, preflight_v22.js, tests/integration_recovery/native_durable_ack.test.cjs, tests/android_e2e_recovery/** | #70, #66, #52 | Native-ACK failure, mirror/primary injection, 5 rapid toggles then kill/restart, Activity recreation, ZEN21:: backup/restore on Android; no data/key change |
| 07-01 | Tasks + Notes: tasks_studio.js, notes_studio.js, notes_drafts.js, notes_editor_ui.js and corresponding tests | #70 #47 #44 #36 #23 #21 #7 #4 | No false save, full numeric IDs, persistent drafts/Undo, long notes, offline process death |
| 07-02 | Timer + goals + work attribution: FocusTimerService.java, NativeCompletionLedger.java, goals_studio.js, quick_training.js, tests/integration_recovery/timer_credit_durability.test.cjs | #66 #44 #25 #3 | No phantom minutes, exactly-once credit and reset/rotation/background handling |
| 07-03 | Localization + numerals: localization_20_recovery.js, locale_rows.js, locale_extras.js, numerals_ascii_v21.js, tests/language_review/** and tests/localization_20/** | #47 #44 #39 #32 #19 #18 | 20-locale source and rendered parity; preserve ar/fa/ur selection, exact user text and generated Western 0–9 |
| 07-04 | Nature audio + completion cues: nature_library_v2.js/css, tools/nature_audio/**, docs/MEDIA_LICENSES.md, tests/nature_library_v2/** | #59 #26 #24 #17 | Genuine file-by-file rights, hashes, Ogg decode, per-device listening, 0 extra telemetry; QUARANTINE until approved |
| 07-05 | Analytics and interaction: analytics_core_v21.js, analytics_recovery_core.js, analytics_recovery_ui.js, tests/analytics_recovery/** | #44 #40 #39 #28 #22 #6 | Real v21 numbers; all drilldown/tabs clickable; no fake data, no language regression |
| 07-06 | Premium UI / accessibility: design_recovery/**, design_tokens_v22.css, ui_components_v22.css, tests/df4_browser/** | #40 #39 #36 #33 #31 #28 #16 #2 | White interface, 320/360/393/430 widths, keyboard/RTL, timer visible prominently, no overflow |
| 07-07 | Control Center / orchestration: docs/control-center/**, tests/control_center/**, tools/control_center/**; isolated tools/recovery_branch_guard/** | #37 #34 #67 #65 | Recover live GitHub read-only sync without overwriting protected app files; SHA/drift checks, no credentials/client tokens or auto-main merges |
| 07-08 | Security, CI and performance: tools/tool_integrations/**, tests/security_recovery/**, tests/performance_recovery/**, .github/workflows/* only with named workflow ownership | #71 #68 #50 #38 #30 #29 #27 #15 #8 | Investigate Gitleaks privately, no leaked findings or external telemetry, exact SHA jobs, no false green for Android |
| 07-09 | Final controlled integration (single owner): SHARED app.js, index.html, integration_v22.js, MainActivity.java and workflow conflict resolutions | All applicable proposals | Run all unified exact-SHA Node/Python/JVM/Chromium/Android gates, negative fault injection, 20 locales, audio license checks; human approval before any main merge |

## Ownership protocol
1. Freeze one 40-char source SHA before starting each specialist; specialists each work in unique isolated branches, not in shared worktrees.
2. A lane may propose a precise patch to a shared file but cannot change shared integration files concurrently. 07-09 owner applies reviewed hunks **only after** 07-00 is complete and all dependent lanes are verified.
3. Every proposed patch must include `base_sha`, `head_sha`, changed paths, old behavior, new behavior, source of truth/PR lineage, negative test, screenshots/device evidence where applicable, and regression risk.
4. No cherry-pick of an ancestor; no whole-file restoration from historical commits; no deleting new feature when replacing a layout; never rewrite 20-language strings to English defaults.
5. One PR per scoped deliverable, Draft by default. New CI status belongs only to its **exact** SHA. A workflow failure caused by untested cases must remain failure until actual evidence passes.

## Shared-file serialization schedule
- BEFORE P0 closure: read-only audit and test-gap design only.
- AFTER P0 closure: 07-01 and 07-02 may develop in isolated owned files; 07-03, 07-04, 07-05, 07-06, 07-07, 07-08 independently on distinct paths.
- LAST: 07-09 consolidates reviewed hunks against newest tested candidate after verifying drift and resolving Git three-way conflicts; then runs full matrix. No branch rebasing with force, no automatic main merge.

## Gated regression command inventory (execute only on actual candidate)
- Node source suite: all relevant *.test.cjs under tests/, including integration_recovery/native_durable_ack.test.cjs, tasks_core, notes_recovery, language_review, security_recovery.
- Python source suite: source test discovery, including performance and localization where appropriate.
- Debug Gradle build: only app Debug APK, no signing change or publication.
- Browser: verify_df4_browser_smoke.yml and 20-locale source workflow with exact commit.
- Android: verify_rescue_webview.yml REAL ADB/CDP (not simulated PASS), full 20-case classification; add native fault injection, multiple toggle kill, Activity recreation, v21 backup/restore.
- Verify media provenance/listening separately; security Gitleaks finding remains blocking pending adjudication.
- Source job 39376606049 at 3ab4ebd provides earlier evidence only; NOT a new result for this docs-only review branch, nor for any future unified SHA.

**Current 07 status: PREPARED / NOT STARTED. No production code changes, integrated regression runs or acceptance for 07 are claimed.**
