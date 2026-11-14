# DEEP FOCUS — Continuous agent state

Durable checkpoint for scheduled development runs. Update after every meaningful unit of work. No secrets or personal data here.
Last refreshed: 2026-11-14 (UTC+3 evening), verified HEAD 2a4b7c8e at the start of this refresh.

## Fixed rules
- Repo `moaz76943-creator/zen-study-focus`. Final destination: `main`; `integration/master-qa-verified-v21` is kept identical (both were fast-forwarded to the same SHA; never force push).
- Package `com.deepfocus.study` (Java class stays `com.zenstudy.focus.MainActivity`). White Premium UI, Arabic/RTL, Western digits 0-9 for app-generated numbers only (never alter user-typed text), protected v21 storage keys + `ZEN21::` backup prefix unchanged.
- Forbidden: Hebrew (and Hebrew-script `yi`), Meditation, unrequested AI features, Cloud TTS, mandatory accounts, a second timer, synthesized audio, destructive data ops, force push, resets, a second repository.
- Size policy (owner decision 2026-11-14): **no aggregate web-assets cap.** Kept: `appJsMaxBytes`, `singleFileMaxBytes`. Do not delete assets or lower audio quality to save bytes.
- Evidence vocabulary: IMPLEMENTED AND VERIFIED / NOT FULLY VERIFIED / PARTIAL / NOT IMPLEMENTED / BLOCKED BY PLATFORM / BLOCKED BY OWNER DECISION / NOT APPLICABLE. A Gradle build or APK is never device QA.

## Completed (do not redo)
- 100/100 registry languages have a pack (650 strings each), all `ai-pending-review` = AI draft, no native review (#618; earlier #598-#607). `bs` re-translated (was 504/650 identical to `hr`). `yi` is not in the registry/packs/locales/runtime; `assets/i18n/contributions/europe_extended/yi.json` is kept untouched. No Hebrew in shipped assets.
- #614 Analytics labels via shared catalog; Diagram Occlusion duplicate fixed. #615 Western-digit engine, local-day task default, DICT-English placeholder priority; `tests/KNOWN_FAILING.txt` empty; full gate 497/497. #607 size/audio re-encode.
- Android CI scripts/Python tests aligned with applicationId `com.deepfocus.study`.
- QA debug APK (QA only, not a release): workflow `df06_exact_source_packages.yml` run 43636459729, SOURCE_SHA 2a4b7c8ef5c65364a9b446309d3a35e49a869be5, versionName 666.0.0 / code 41386, `app-debug.apk` SHA256 `9a0b43c5a0c3f25c3ae051383202f49d71143fdc928fa669971f9842158b54c3` (re-verified). Proves compile/package only.

## Known failing CI (identical on base; not required by branch protection)
- Gitleaks: tree = 2 public storage-key/fixture strings in `tests/security_recovery/track13_private_triage.test.cjs`; history = 12 findings, 4 unresolved (needs a real Gitleaks run). CodeQL fail-closed. Legacy `source coverage` probe hard-coded to 99 locales (being ported to the 100-language registry). analytics-browser `share_card_clipboard_browser` timeout.

## Backlog (priority order)
1. Port 99-locale coverage tooling to the 100-language registry.
2. CodeQL findings with evidence. 3. Gitleaks tree + history triage (no broad allowlists).
4. Runtime localization audit (RTL, digits, placeholders, fallback, English leaks).
5. Analytics 10,000-record performance. 6. Notes/Tasks scale, persistence, recovery.
7. Timer lifecycle/alarms/notifications/Doze/duplicate completion. 8. Audio sources/licenses/playback/focus.
9. Accessibility + responsive. 10. Backup/restore/SAF/interrupted writes/v21 preservation.
11. Device/emulator tests where available (label NOT_TESTED otherwise).

## Device-only / human-only (cannot be done here)
Real-device timer/Doze/notification/audio-focus/Bluetooth checks; native-speaker review of all 99 non-English packs (especially low-resource: sm haw hmn gd co fy la om).

## Checkpoint log
| Date | HEAD | Work | PR | Result |
|---|---|---|---|---|
| 2026-11-14 | 2a4b7c8e | 100/100 packs + QA APK dispatch | #618 | merged |
| 2026-11-14 | 2a4b7c8e | remove global web-assets cap; refresh this file | this PR | see PR |
