# TRACK 06 — Final Integration Recovery: executable QA handoff (2026-10-20)

**Canonical executable application source before this branch's QA-only changes:** `3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8` (PR #70; keep draft).
**Canonical review branch:** `review/track06-gated-checkpoint-20261020`; all source files under `android/` are inherited from that application source unchanged. This branch only adds prior TRACK06 docs, this report and narrowly allows the already-existing GitHub Actions test workflows to run on this isolated branch; it is NOT a new integration engine.
**Gate:** `RELEASE_APPROVED=NO`. DO NOT MERGE MAIN. Do not modify v21, schema, numeric IDs, unknown fields, Floot dashboard, production audio, package ID or signing.

## Live PR heads, ancestry, duplicated work
- #25 `be890c7487ba042af12b764a1a211fe7beed2a4e` — ancestor.
- #52 `534912ce2d90d8988981c7d32e8bcb69671003f0` — ancestor.
- #66 `bd6e3e4d8aef95def871c9e7f78c63807e681369` — ancestor; #70 ahead 21, behind 0.
- #70 `3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8` — selected app head.
- #72 `a1577ce295c10edbaa3bfa727b8a3ee28c058548` — dashboard-only, divergent, deliberately excluded; no Floot/dashboard modification.
- #44 `93aa1be5dd3fcc08027b5ffe9fd03d6b5e250b09` and #47 `163cc0a83be8219f929f0c6907c8da85a0f33e49`: history diverges. `notes_drafts.js` blob `179af1d124ba78f132236b70ed171f142b606729`, `notes_studio.js` blob `5e15f7bcce880640a5b92f931cdaa8557600bced` equal on both and candidate. No duplicate cherry-pick.
- #68 already identical in candidate: workflow blob `aec4c5a324c9d2bc540a9eda1aec3d0fc8d8a345` and test blob `efef3037703ad6c6ada41d126cc93199663d704a` (before this QA branch-only workflow trigger change).
- Outstanding independent proposals include #59 audio quarantine/provenance, #71 security (Gitleaks candidate detection), #72 dashboard, #65 agent orchestration and #67 conflict guard. Do NOT promote them into Android source without per-file audit.

## Source evidence (before branch-only CI)
GitHub run `39376606049` on app SHA #70: 584 Node PASS, 31 Python PASS, Debug build SUCCESS. It does **not** establish full physical Android acceptance. Chromium success on PR #66 run `39360536643` predates native durability addition and is NOT evidence on #70 SHA.

## Android P0 evidence
Run `39376600969` at #70 exact SHA: Android API30 ADB/CDP task durability: 3 PASS, 0 FAIL, 17 NOT_TESTED; four extra rapid toggle->kill->reopen rounds. UIAutomator 20 NOT_TESTED, strict overall workflow FAILURE. The previous pre-AtomicFile checklist rollback failure was real. This evidence only passes the focused reproduced defect. Native ACK failure / primary and mirror errors / interrupted journal / multiple toggles before a single kill / Activity recreation / Notes, Timer and backup restore after Android process death / owner physical device remain unverified on real Android. Browser or Node simulation must never upgrade them to Android PASS.
Current `tests/integration_recovery/native_durable_ack.test.cjs` has Node fakes for rejected ACK, mirror failure, rapid writes, interrupted journal and corrupt checkpoint. Those are SOURCE tests, not Android fault-injection.

## Required QA on this branch at ONE exact HEAD
Three pre-existing workflows now include this branch in their *push branch allowlist* (no other event or release gate change):
1. `verify_deep_focus_rescue.yml`: source Node/Python, focused Java, release media blocker, Debug build.
2. `verify_df4_browser_smoke.yml`: actual Chromium responsive UI, interaction, picker and navigation.
3. `verify_rescue_webview.yml`: actual disposable Android API30 WebView/ADB/CDP **full scope** (this branch does NOT qualify for the #70 forced-focused selector). Failing unexecuted cases must remain NOT_TESTED.
Check exact action run, jobs and artifacts for the branch HEAD after triggering; no outcome claimed until logs exist. If new CI failed, preserve its actual FAIL.

## Agent QA issue #69
Issue #69's 12/12 `FULL_SOURCE_CYCLE_PASS` verifies source SHA `93aa1be5dd3fcc08027b5ffe9fd03d6b5e250b09` using automation/main coordination and separate checkout of `fix/master-completion-20261020`. It does NOT imply 12/12 on candidate #70 or that 12 autonomous coding workers are running in production. Its Android, media, release statuses remain unapproved.

## Track 07 owners (only AFTER P0)
- 07-00: MainActivity.java / preflight_v22.js / v21 journal / Android fault cases — single native storage owner.
- 07-01: tasks_studio.js, notes_drafts.js, notes_studio.js, notes_editor_ui.js.
- 07-02: FocusTimerService.java, NativeCompletionLedger.java, goals_studio.js, quick_training.js.
- 07-03: localization_20_recovery.js, locale_rows.js, locale_extras.js, numerals_ascii_v21.js, tests/language_review/**.
- 07-04: nature_library_v2.js/css, tools/nature_audio/**, docs/MEDIA_LICENSES.md; quarantine only.
- 07-05: analytics_core_v21.js, analytics_recovery_core.js, analytics_recovery_ui.js.
- 07-06: design_recovery/**, design_tokens_v22.css, ui_components_v22.css; only approved UI diffs.
- 07-07: docs/control-center/**; PR #72 / Floot remain out of this integration.
- 07-08: test security and agents in isolated tools; classify PR #71 privately.
- 07-09: CENTRAL INTEGRATION OWNER ONLY: app.js, index.html, integration_v22.js, MainActivity.java, shared workflows. Serialize all shared file patches and require SHA-pinned unified tests.

**Strict exit:** do not call P0 closed until all required Android real-device scenarios have signed exact-SHA evidence; do not call integration complete or move/merge any PR to main.
