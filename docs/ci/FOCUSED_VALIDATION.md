# Focused validation and release build scope

Official branch: `integration/master-qa-verified-v21`.

## Acceptance levels

Level 1 validates changed-file syntax/build, the affected feature contracts,
CodeQL, Gitleaks and risk-specific real API30/API35 acceptance. Tests involving
persistence, native ACK, timer delivery or save rejection remain merge blockers
when they expose a real defect. A Node result is not Android acceptance.

Level 2 retains all widths, font scales 100/150/200%, extended locales, long
performance runs, full Android E2E, sounds and extended export/recovery checks.
Run these through intentional full-QA dispatch or `v*` release tags. GitHub schedules
run only from the repository default branch (`main` here); no scheduled execution
is configured because `main` is not the official branch. Moving a
matrix to this level does not clear its known failures. Keep failing case IDs
and rerun those cases after the repair before merging.

Results are valid only for their recorded source SHA and affected source files.
Refresh the official branch before merging. Use concurrency groups containing
both workflow and PR/ref identity so a newer update cancels stale runs for the
same PR without cancelling another PR. Never use `continue-on-error` to accept
a failure.

## Implemented shared configuration

`.github/actions/android-emulator/action.yml` provides one disposable emulator
configuration for API30/API35: 2048M RAM, 256M heap, 900s boot bound, no snapshots,
no audio, software GPU, and Vulkan disabled with the reduced API35 skin. Callers
retain their own command, environment, isolation, source/APK receipts and strict
exit status. Notes and Tasks now each build one app/test-APK pair in their source job, then
download the same immutable pair for every device case. Each download verifies
the exact source SHA and both APK hashes before installation. The distinct
instrumentation configurations retain separate builds and isolated emulators.
PRs run font100% on API30/API35; manual and tag runs retain font100/150/200%
on both APIs. Known failing cases still require explicit reruns before merging.

`auto_release_build.yml` now uses the existing installed Gradle 8.11.1 convention
and Android36 SDK, because this repository has no committed Gradle wrapper.
It runs only for `v*` tags or manual dispatch. Manual dispatch defaults to debug;
AAB and combined builds require an explicit choice. The AAB is labelled unsigned,
not production-ready. No signing keys, package identity or release publication
are changed. A combined build uses one Gradle invocation and no redundant clean.

## Audit findings

The inventory below records the 69 definitions inspected before these changes. Job counts describe
static definitions; runtime matrix fan-out can be larger. Several jobs install
the same SDK and build a debug APK independently, especially Notes and Tasks
font matrices. Their test APKs and Gradle modifications differ, so blindly
sharing one built APK would invalidate their acceptance evidence. Prefer one
build per exact instrumentation configuration, then fan out acceptance using
that immutable artifact.

Historical `build_*` workflows predominantly trigger only when their own YAML
changes or by manual dispatch. They do not all run for every ordinary Gemini
commit. Their pinned historical release outputs must not be treated as the
current official application. They have been retained by this scoped change.

`df_pr04_api30_api35_smoke.yml`, native-dialog QA, timer QA, Notes instrumentation
and Tasks instrumentation each launch their own emulators. These tests overlap
in build/setup, but assert distinct behavior; removing them wholesale would lose
evidence. Shared emulator configuration addresses settings drift while focused
feature workflows choose necessary runs.

There are no `workflow_run` triggers in the audited definitions; no automatic
workflow-to-workflow loop was found. CodeQL and Gitleaks are distinct security
checks and both remain active. The all-repository CodeQL review digest is a
separate security-policy issue and must not be resolved by disabling scanning.

## Implemented duplicate-work reduction

For each Notes/Tasks workflow, a full six-case matrix previously repeated SDK
installation, Gradle setup and APK/test-APK compilation six times. It now builds
once and fans out the six immutable artifact consumers: **6 → 1 builds** per
feature for full QA. The normal two-device PR path is **2 → 1 builds**, with two
necessary emulator launches per feature. Full font coverage remains a manual/tag
path; this change cannot clear any previously known failing font case.

`df06_exact_source_packages.yml` no longer builds debug+release packages on every
ordinary official-branch `app.js` update. Its intentional manual path and YAML
change validation remain. This removes one redundant heavy package build from
that ordinary-commit path. Release tags/manual release builds remain separate
from feature acceptance and never publish an unsigned AAB as production-ready.

The shared emulator action and workflow/ref concurrency make configuration and
cancellation consistent without mixing results from different PRs or source SHAs.

## Audited workflow inventory

Inspected 69 workflows, 24 APK/AAB build-job definitions, 23 SDK-install job definitions and 8 emulator-job definitions before matrix expansion.

| Workflow | Triggers | Build jobs | Emulator jobs |
| --- | --- | --- | --- |
| auto_release_build.yml | push tags=v*; workflow_dispatch | build | — |
| build_apk.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | sanitized_v303-debug-apk | — |
| build_closed_test_aab.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | mission177-aab | — |
| build_lang_catalog_v307.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build-v307 | — |
| build_play_release_v307_v22.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | play-release-v307 | — |
| build_play_v313_package_verified.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | release-v313 | — |
| build_play_v314_no_fgs.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build | — |
| build_studio_audio_v305.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build-v305 | — |
| build_v323_safe_i18n_play.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build-v323 | — |
| build_v330_grand_completion.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build | — |
| build_v332_production_ready.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build | — |
| build_v340_complete_sweep.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build | — |
| build_v340_play_v24.yml | push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | build | — |
| df03_analytics_browser.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df03_android_touch_guards.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df03_locale_navigation.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df03_source_coverage.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df05_nature_catalog.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df06_exact_source_packages.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | packages | — |
| df07_kpi_noninteractive.yml | push branches=fix/df07-kpi-noninteractive-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df07_real_touch_outcomes.yml | push branches=qa/df-parallel-07-touch-outcomes-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df07_timer_20_locale_confirm.yml | push branches=qa/df07-timer-20-locale-confirm-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df07_timer_cdp_safety.yml | push branches=qa/df-parallel-07-timer-cdp-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df07_timer_control_bindings.yml | push branches=qa/df-parallel-07-button-bindings-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df07_timer_real_buttons.yml | push branches=qa/df07-real-timer-buttons-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df08_android_instrumented_touch.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | android | android |
| df08_completion_alert_media.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df09_android_analytics_a11y.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | real-android | real-android |
| df09_legacy_analytics.yml | pull_request scoped paths | — | — |
| df09_tone_picker.yml | pull_request scoped paths | — | — |
| df13_d_core_locale_source.yml | push branches=qa/df13-d-core-locale-repair-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df13_e_functional_locale.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_final03_tasks_real_android.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | android | android |
| df_final03_track08_canonical_qa.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df_integration_critical_regressions.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; push branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_lane08_99_exact_head_qa.yml | push branches=lane08/quick-training-99-consolidated-20261026 | — | — |
| df_lane11_exact_head_qa.yml | push branches=df/lane11-rtl-typography-numerals-20261025; pull_request branches=integration/master-qa-verified-v21 | — | — |
| df_parallel01_counter_recovery.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_parallel01_native_dialog_android.yml | push branches=fix/df-parallel01-native-dialogs-current-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | device | device |
| df_parallel01_timer_credit.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_parallel06_analytics_completion.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; push branches=fix/df-parallel06-analytics-completion-20261026 | — | — |
| df_parallel09_mobile_qa.yml | pull_request scoped paths; workflow_dispatch | — | — |
| df_pr00_v21_baseline.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| df_pr01_undated_tasks.yml | push branches=fix/df-pr01-legacy-undated-tasks-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_pr03_quick_safety.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; push branches=fix/df-pr03-quick-config-ack-20261026 | — | — |
| df_pr03_sport_rest.yml | push branches=fix/df-pr03-sport-rest-atomic-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| df_pr04_api30_api35_smoke.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | android-smoke | android-smoke |
| df_pr04_native_reconciliation.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | android-source | — |
| df_room04_csv.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | real-android | real-android |
| legacy135_timer_consent_i18n_gate.yml | push branches=fix/legacy135-timer-consent-l10n-20261026 | — | — |
| legacy_pr160_noteids.yml | push branches=fix/legacy-pr160-unchanged-noteids-20261026,integration/master-qa-verified-v21 scoped paths; pull_request scoped paths | — | — |
| legacy_pr80_activity_domain_ack.yml | push branches=fix/legacy-pr80-activity-domain-ack-20261026,integration/master-qa-verified-v21 scoped paths; pull_request scoped paths | — | — |
| legacy_pr81_task_ack.yml | push branches=fix/port-legacy-pr81-task-ack-20261026 | — | — |
| legacy_pr82_analytics_range_qa.yml | push branches=integration/legacy-pr82-range-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| legacy_pr83_indic_digits_qa.yml | push branches=integration/legacy-pr83-indic-digits-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| legacy_track05_tick_guard.yml | push branches=fix/legacy-track05-tick-guard-20261026; pull_request branches=integration/master-qa-verified-v21 | — | — |
| legacy_v21_schema_guard.yml | push branches=fix/legacy-p0-v21-preflight-schema-20261026; pull_request branches=integration/master-qa-verified-v21 | — | — |
| locale_button_accessibility.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| p0_immutable_package_identity.yml | push branches=fix/p0-immutable-package-id-20261026; pull_request branches=integration/master-qa-verified-v21 | — | — |
| publish_v340_aab_zip.yml | push branches=integration/master-qa-verified-v21 scoped paths | — | — |
| publish_v340_direct_download.yml | push branches=integration/master-qa-verified-v21 scoped paths | — | — |
| qt99_locale_admission.yml | push branches=integration/qt99-admission-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
| recovery_merge_probe.yml | push branches=audit/deep-focus-integration-conflicts-20261020; workflow_dispatch | — | — |
| saf_native_import_current_qa.yml | push branches=integration/master-qa-verified-v21 scoped paths; pull_request branches=integration/master-qa-verified-v21 scoped paths | test-build | — |
| track05_timer_lifecycle_20261021.yml | push branches=fix/df-final01-track05-native-active-timer-20261026; pull_request branches=integration/master-qa-verified-v21 scoped paths | android-timer-qa | android-timer-qa |
| track13_codeql_exact_sha.yml | pull_request branches=integration/master-qa-verified-v21; push branches=integration/master-qa-verified-v21 scoped paths; workflow_dispatch | — | — |
| track13_security_exact_sha.yml | pull_request branches=integration/master-qa-verified-v21; push branches=integration/master-qa-verified-v21; workflow_dispatch | — | — |
| track14_android_screenshot_qa.yml | push branches=fix/df-parallel09-android-qa-20261026 | screenshots | screenshots |
| webview_dom_compat.yml | pull_request branches=integration/master-qa-verified-v21 scoped paths | — | — |
