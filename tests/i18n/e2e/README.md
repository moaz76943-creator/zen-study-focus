# DF-LANE-13 — source coverage and real Android smoke

Scope owned: `tests/i18n/e2e/`, `tools/i18n/e2e/`, and `.github/workflows/i18n_e2e.yml`. No app data, WebView, APK, signing, release policy or third-party lane files are changed.

## Current verification design

- **Dictionary job (Node 22, no Gradle):** runs unit tests, existing authoritative `tools/df99_full_app_coverage.cjs --json`, and independent Core/Quick empty-string measurements across exactly 99 distinct Language Catalog codes. Outputs `PER_LANGUAGE_COVERAGE.json` and `.md`. Values marked missing/fallback do **not** count as translated. Strict mode exits nonzero if language deficits exist; artifacts upload even then. Coverage of registered keys does not prove visible UI labels.
- **Android jobs (API 30 and API 35):** each job checks out the event HEAD (never pinned to an old release), builds **one** debug APK from that exact SHA, installs it, runs ADB/UIAutomator on the real application WebView, tests offline boot, navigation, timer state change, task creation, note save/restart, and repeated native language selection/persistence for a representative script sample (en, ar, de, hi, ja, fa, ur). It records individual PASS/FAIL/NOT_TESTED instead of treating script completion as proof.
- Android device screenshots for 320/360/393/430 physical-pixel widths and 100%/200% font scales are collected after changing density to 160dpi so Android density-independent widths align with CSS-pixel intentions. A visible title is only a *boot assertion*, **not** visual-layout, clipping, RTL, or TalkBack acceptance.
- Safety: disabled Wi-Fi/mobile data for the offline restart; tests operate on an ephemeral emulator install only, never on user devices. The language matrix clears **only emulator test data** between language cases. A real device is required for spoken TalkBack validation. UIAutomator cannot prove sound playback, DOM-level injection safety, or 10k sessions without fixtures; those are emitted as NOT_TESTED.
- If UIAutomator fails to expose controls, the corresponding attempted check is FAIL with the failure reason, not a silent skip. Blocked checks remain NOT_TESTED. Screenshots and JSON are uploaded with `if: always()`.

Run locally:

```sh
node --test tests/i18n/e2e/*.test.cjs
node tools/i18n/e2e/coverage.cjs --output artifacts/i18n-e2e/source --strict
# Once a HEAD-built debug APK is installed in a running API 30/35 emulator:
python3 tools/i18n/e2e/android_device.py --output artifacts/i18n-e2e/api30 --sha "$(git rev-parse HEAD)" --api 30
```

## Acceptance caveats / coordinator handoff

`PASS` refers only to a performed assertion; `NOT_TESTED` means no assertion was run or the tool cannot prove the property. A red dictionary job is actionable localization debt, not an excuse to report 99 Android passes. Compare `SOURCE_SHA.txt` and `APK_SHA256.txt` before using the evidence. Attach CI run URLs and blocker JSON from the actual workflow. Review with the integration coordinator before merging; this lane does not approve a Play release. Android menu selectors are black-box accessibility locators and may need adjustment based on emulator dumps. Do not alter other lane-owned code to make tests green.
