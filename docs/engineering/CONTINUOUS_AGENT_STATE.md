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

## Status after the closeout run (2026-11-14/15)
- Integrated: #620 (asset cap removed), #621 (coverage probes use `i18n/languages.json`, jv->jw alias, `prs` documented legacy), #622 (CodeQL fixes at source + Notes cap fix + alarm commit ordering + scale probes), #623 (Gitleaks exact value+path exceptions). main == integration.
- CodeQL: 8 -> 1 open. Remaining `js/http-to-file-access` at `tests/android_e2e_recovery/private_evidence.cjs:68` is the hardened O_EXCL|O_NOFOLLOW evidence writer; its adjudication digest (`tools/security/codeql_adjudications.json`) is stale after tooling edits and needs an INDEPENDENT re-review (not self-approved).
- Gitleaks: tree = 0, history = 1. **REAL SECRET**: `.github/workflows/build_release_aab.yml` @ 3a51d4a6 (removed in c81aee2e) held a base64 keystore + plaintext alias/password, reachable from tags v441.0.0+. BLOCKED BY OWNER DECISION: rotate that key, decide on history rewrite. Not allowlisted.
- Notes: creating beyond MAX_NOTES used to lock the collection (fixed, `NOTE_LIMIT_REACHED`). Analytics/Notes/Tasks 10k probes: `tools/perf/analytics_scale.cjs`, `tools/perf/notes_tasks_scale.cjs` (Node, not Android).
- Timer alarm: schedule/cancel/completeNow clear the AlarmManager alarm only after the state commit; delivery shares the class monitor (source test only; Android delivery NOT_TESTED).
- Responsive: `tools/perf/responsive_320.cjs` - 320px, 100%/200% text, en/ar/de/ru, 0 off-screen controls after the Studios-pill fix (ViewportOptimizer no longer overwrites inline transforms). TalkBack and contrast NOT_TESTED.
- Runtime i18n audit (10 languages, headless Chromium): digits all Western; 43-69 of ~570 visible strings per language still English (loanwords/brands, speed-reading tutorial text and seeded sample tasks/notes that are not in the 650-key catalog). The catalog is a DOM gap-filler over the legacy dictionaries. PARTIAL.
- Design decision for owner: a sub-minute timer completion is stored in `sessionHistory` with `minutes:0` (it is the idempotency record); Analytics counts it as a session. Excluding it breaks existing contract tests, so it was left unchanged.
- Audio: 6 ogg + 5 wav, all decodable, all in license registers (Wikimedia CC0/PD, VCSL/Dewdrop CC0); online licence re-verification and loop/mix/audio-focus on device NOT_TESTED.
- Old PRs closed as superseded: #580 #548 #545 #549 #551 #518; #516 re-applied on HEAD via #622.
- CI known red (infra/pre-existing): `analytics-browser` (share-card clipboard timeout), emulator `device (30/35)` (APK-not-installed flake; `android-smoke (30/35)` pass).

## Device-only / human-only (cannot be done here)
Real-device timer/Doze/notification/audio-focus/Bluetooth checks; native-speaker review of all 99 non-English packs (especially low-resource: sm haw hmn gd co fy la om).

## Checkpoint log
| Date | HEAD | Work | PR | Result |
|---|---|---|---|---|
| 2026-11-14 | 2a4b7c8e | 100/100 packs + QA APK dispatch | #618 | merged |
| 2026-11-14 | 8dea4186 | closeout: #620-#623 integrated | #620-#623 | merged |
| 2026-11-15 | 8dea4186 | responsive pill fix, state refresh, final QA APK | this PR | see PR |
