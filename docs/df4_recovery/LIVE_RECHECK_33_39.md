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
