# Live recheck after initial baseline (2026-10-19)

PRs #33–#38 appeared/advanced during this isolated work. Re-read current bodies and file lists; no branch overwritten or merged. Main and integration #25 remain fab0b8bb and 0dd9239. Our draft is #39. Initial LIVE_PR_SNAPSHOT.json is historical, not latest inventory.

| PR | Observed HEAD | Shared overlaps |
|---|---|---|
| #33 | `930511d4d0581111c5b2eb70f49e0737a2bee9e8` | .github/workflows/verify_chatgpt_recovery.yml, android/app/src/main/assets/web/index.html |
| #34 | `c1f273a45862ffbd8dd372082097229a0dad6425` |  |
| #35 | `2a6f5cf996da6515ffb6626693ab26d0f9b7c9df` | android/app/src/main/assets/web/app.js |
| #36 | `9e1a0dfc8324474b096128694f25f5d438b6ad43` | .github/workflows/verify_chatgpt_recovery.yml, android/app/src/main/assets/web/completion_alert_settings.js, android/app/src/main/assets/web/tasks_studio.js |
| #37 | `dee640535a7cb6675e12e529859d752170415edd` | .github/workflows/control_center_audit.yml, docs/control-center/index.html |
| #38 | `078ade5309ea7ebc365aacb38a1090b9bdf0c013` | .github/workflows/df4_android_e2e.yml |

#33/#36 overlap picker styling and HTML; #35 overlaps app.js empty categories; #36 also simplifies Tasks Studio (not imported here). #34/#37 are isolated developer dashboards; neither enters the Android user interface. #38 runs real UIAutomator on a fresh hosted emulator, stacked on #33. No results at its SHA may be attributed to #39. Retain branches for human diff-based consolidation. Prefer final HEAD diffs: #35 removed prior duplicate picker changes with forward commits.

Initial #39 CI e934109 run 39244072514 failed: hosted runner lacked rg, producing an empty suite list and causing Node automatic discovery to include the deliberate media release failures. Fixed discovery using standard Python pathlib plus an explicit nonempty-list assertion (0ca8a39). No assertion or release gate weakened.

Remote hosted emulator availability was established from #38 running its actual emulator step. Added an exact-head Android job to #39, consuming the APK from the same workflow run without rebuilding. Fresh disposable emulator only; no real phone/backup access. Preserve PASS/FAIL/NOT_TESTED including manual cases. No KVM permissions workaround added; emulator startup may remain blocked by hosted-runner hardware access. Results must be reported from the final SHA, not assumed from workflow presence.

#38 remote emulator did boot, but its action then failed before executing cases: `/usr/bin/sh -c set -euo pipefail` reports `Illegal option -o pipefail`. #39 uses a single explicit Bash script to keep variables in one shell and avoid that harness failure. Requests slow completion/rotation in the disposable emulator and captures final screenshot/native runtime log even on failure. No #38 scenario is claimed PASS.

## First completed exact-head Android attempt

f491c91490bc43adcb0af042c2698f1ff0f6d3f6, run 39244485873: test-build SUCCESS (363 Node, 31 Python plus 4 harness helper tests; media release gate 1 PASS/2 FAIL intentionally preserved). Debug APK SHA256 from CI log: 83670098f6a2bc17d8bd7bb741f3883554a400b6a5306b8f66131f261e9c9653. APK/evidence artifact 12182508077. Android result artifact 12184135601.

Android attempt: 0 PASS / 9 FAIL / 11 NOT_TESTED. APK installed successfully; no device usability pass. Emulator logged missing KVM permission and needed 549.581 seconds to boot. Repeated UIAutomator dumps failed or returned no hierarchy. Do not classify that as a working app or silently drop failures. Artifact downloads from the external blob host returned HTTP 403 in this environment; GitHub run logs were readable once completed, so exact outcome and APK checksum were confirmed there. Screenshots/runtime files remain in the Android result artifact, not independently viewed here.

First narrow infrastructure repair: assign /dev/kvm access to this disposable hosted runner's user before boot, following the demonstrated hardware-acceleration requirement of #38 without touching Android manifest/app permissions. No owner's machine/device changes. Capture stdout fallback for empty stderr and print synthetic-only runtime/result diagnostics into CI logs to distinguish instrumentation failure from app failure. A new exact-head run is required; no acceptance claim from the repair's existence.

## Latest PRs #40 and #41

Inspected #40 a3d02832d62ea33cd18e2ff21a921bc8cee2194a (overlapping picker/nature/translated note-type proposal) and #41 31787e528b84dbcc8a9181b1544aeb0d4369b06b (child of this PR at f491c91; compact Tasks, 20-language nature volume labels and isolated control center). Their app/UI files were not copied over our shared code. Their branches are preserved for deliberate consolidation. #41 reports a System UI ANR in the prior Android screenshot; this screenshot was not independently viewable in our environment because artifact downloads are denied. Do not turn that external report into a phone success claim.

Selectively applied only #41's reviewed Android runner/test hunks: inaccessible UIAutomator hierarchy becomes NOT_TESTED and blocks dependent scenarios; the job still exits nonzero. Added an independent test that observed app assertion failures remain FAIL. All 7 helper unit tests PASS (not device tests). Historical first-run 9 FAIL/11 NOT_TESTED results stay immutable in the log. Bounded screenshot/logcat collection to 20 seconds each so a broken emulator cannot stall final diagnostics indefinitely. No production engine, assertion or media gate was weakened by this classification fix.

Second attempt 39246903736 on 0ac699c: KVM repair is confirmed by 24,284 ms boot (previously 549,581 ms). Log records preflight tree availability followed by missing tab controls and eventually `adb: device offline`. The run was superseded/cancelled when verified singular-ID and runner fixes were pushed; no successful Android acceptance is claimed. This also exposed unbounded post-test adb screenshot/logcat collection, now bounded. Preflight now explicitly requires the actual app timer control and handles the known Android notification-permission prompt only when disposable-profile consent is present. System dialog hierarchy alone never certifies app startup. All 8 runner helper tests pass; failures of observed app assertions remain FAIL. Final UI XML is retained/printed (synthetic CI data only) to make any remaining missing-control failure reviewable.

Final 1b7b04c run 39249622967 completed: 364 Node PASS, 31 Python PASS, 8 runner-helper PASS, debug build SUCCESS. APK checksum 68a514946f6062f33763125c087b5967357a909bc53146d68c03e01651b6acb0; APK artifact 12184638619; Android artifact 12185286515. Android reports 20 NOT_TESTED, job FAILED. The captured XML printed in the CI log has only a zero-height FrameLayout belonging to com.google.android.permissioncontroller, not observed app controls. No Android behavior accepted. Screenshot/runtime logs are preserved in the artifact; no local download/visual inspection claim.

Last bounded repair for that permission-window blocker: explicitly pregrant POST_NOTIFICATIONS only to the newly installed package in the fresh CI emulator before launching core interaction cases. No manifest/production permission or owner-device state changed. Permission prompt/denial handling is expressly NOT_TESTED under this fixture and requires a separate test. Core assertions, strict device gate and genuine NOT_TESTED results stay unchanged. If the new environment still cannot expose app controls, stop this root-cause repair and provide logs for an independent Android device/runner, rather than reclassifying it PASS.

Reviewed E2E selectors against the actual integrated source before final execution: old Tasks placeholder "Add study" and analytics proof "Completed Sessions" belong to hidden legacy screens. Updated to visible Tasks Studio/Type a task and Recorded analytics labels (including Arabic). No assertions removed. Strengthened note edit to require UpdatedBody after save and restart, and task creation to require the created task after restart, rather than claiming durability from title presence in one render.
