# Deep Focus — QA 08 live audit (2026-10-19)

Task: DEEP-FOCUS-08-COMPLETE-QUALITY-RELEASE.
Integration baseline: fix/v21-safe-release-recovery-20261018 at 527d85978c8dfd3a3eab8aa8cfae199c4d541c8b.
QA branch: qa/deep-focus-08-quality-gates-20261019.
Ownership: only tests/integration_quality/, tests/regression_v21/ and this QA document. Lane 03 work is untouched.

## Inspected live GitHub refs

| PR or lane | HEAD | Status |
|---|---|---|
| PR #1 / baseline | 527d85978c8dfd3a3eab8aa8cfae199c4d541c8b | Draft, base main |
| PR #2 / 07 UX | 9bd1270ee9436865613ab0b196fbeded626e24be | Draft, not integrated |
| PR #3 / 06 focus | dbcfe64afcaac502ec135260899ff70865f68534 | Draft, not integrated |
| PR #4 / 04 tasks | 90f543a5ec3a12c3a664fd22266deb2511f0bc12 | Draft, not integrated |
| PR #5 / 02 notes engine | 3ca96d32b622b1085a9809a985354dff073ed83c | Draft, not integrated |
| PR #6 / 05 analytics | 098087e979def1e9930ba5ef69f9e3212054d2fc | Draft, not integrated |
| 01 data contract | de74a86627ad0762d26b98752068db311afccb6c | independent branch, not integrated |
| PR #7 / 03 Notes UX | 50f1a8f939df9386b03a21817ec048c0c4d11239 | Draft; newly opened while QA work proceeded, not integrated |

Reviewed: PR changed-file lists; branch contracts and module tests; baseline index.html, app.js, notes_studio.js, notes_drafts.js, AndroidManifest.xml, build.gradle, build_apk.yml, smoke_app.cjs, design roadmap.

## Actual test results

- Isolated real-source JavaScript checks on feature branches: nine corrected cases PASS. Legacy numeric IDs and unknown fields survive edits; fake IDs rejected; Arabic search works; note checklist extraction deduplicates; completed focus task credits 25 min once; legacy timestamps remain unspecified; demo and invalid sessions are excluded; simultaneous sound tracks and disposal work.
- The committed five-case cross-lane QA source was executed against the real 01/02/04/05/06 source heads in an isolated V8 loader with approximated Node assertions: 5 PASS, 0 FAIL. It does not prove UI integration.
- Deterministic code-scale checks: 5,000 Arabic notes, 1,000 tasks (996 non-starter), 10,000 session rows (5,000 unique) all PASS. Not Android resource or battery benchmarks.
- Baseline guard suite was run against retrieved baseline source via an isolated V8 Node-API shim: 4 PASS, 0 FAIL.
- Activation-gate suite run against baseline: 0 PASS, 7 expected RED due to absent unmerged JS/CSS modules. These are integration blockers, not evidence that feature branches fail internally.
- GitHub Actions baseline SHA 527d85978c8dfd3a3eab8aa8cfae199c4d541c8b: run https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39182158514 was successful. JS syntax, legacy smoke, Python tests, debug APK and unsigned AAB steps succeeded. Artifact DeepFocus-Test-APK-and-Unsigned-AAB exists. signed-release was skipped.
- No Android phone/WebView, upgrade, TalkBack, audio background, native notifications, Play signing, physical UI, quota or battery measurements took place.

## Feature activation matrix

| Feature | Code branch | Live UI connected | Isolated function | After merge | Android |
|---|---|---|---|---|---|
| 01 data compat | Yes | No | Partial PASS | BLOCKED | NOT_TESTED |
| 02 notes core | Yes | No | Partial PASS | BLOCKED, depends on 03 | NOT_TESTED |
| 03 Notes UX | Draft PR #7 | New UX not integrated | Isolated lane test claims, not independently accepted | BLOCKED | NOT_TESTED |
| 04 tasks/calendar | Yes | No | Partial PASS | BLOCKED | NOT_TESTED |
| 05 analytics | Yes | No | Partial PASS | BLOCKED | NOT_TESTED |
| 06 focus/goals/sounds | Yes | Enhancements not integrated | Partial PASS | BLOCKED | NOT_TESTED |
| 07 premium UI/20 locale tables | Yes | No | Code checked (20 locales / 22 keys) | BLOCKED | NOT_TESTED |

## Release gate matrix for the intended integrated app

| Gate | Status | Main reason |
|---|---|---|
| 1 Data Safety | BLOCKED | lane 01 journal and migration flow not integrated |
| 2 Functionality | BLOCKED | missing live UI core connections |
| 3 Integration | BLOCKED | feature branches not merged; 03 still in progress |
| 4 Accuracy | BLOCKED | isolated math PASS but end-to-end timer ledger unverified |
| 5 UI/UX | BLOCKED | no live new design verification |
| 6 Localization | BLOCKED | 20 tables not active/tested throughout app |
| 7 Security | NOT_TESTED | native XSS, adversarial input, quotas not validated |
| 8 Android Build | BLOCKED | baseline build PASS only; integrated APK/AAB not built |
| 9 Device QA | NOT_TESTED | real device, background timer/audio, upgrade and TalkBack |
| 10 Production | BLOCKED | signing/licenses/device/Play review not approved |

READY_FOR_TEST_BUILD: NO for the new integrated feature release; a baseline v21 test APK exists.
READY_FOR_PRODUCTION: NO.

## Reproducible committed QA tests

- tests/regression_v21/qa_baseline_guards.test.cjs: package and v21 keys, smoke test presence and signing check.
- tests/integration_quality/qa_cross_lane.test.cjs: note-to-task-to-focus-to-analytics, mirror fallback, numeric IDs, session validity and mixer.
- tests/integration_quality/qa_scale.test.cjs: scale tests for real pure engines.
- tests/integration_quality/qa_activation_gate.test.cjs: deliberately RED until actual integration by 00.

After the modules are merged, run Node test runner on tests/regression_v21/*.test.cjs and tests/integration_quality/*.test.cjs, then existing tests/smoke_app.cjs, tests/validate_locales.cjs, existing Python regression and a single Android build at the final SHA. Source-only unit tests do not replace real device checks.

## Required lane 00 actions, prioritized

1. P0 release blocker: review PR #7 and its tests/notes_ui/INTEGRATION.md contract, but do not merge unfinished Notes UX or edit its branch in QA. Its adapter needs a verified journal-aware commitNotes and atomic commitBoth for task extraction; old saveFortressData swallows write failures and cannot acknowledge durable saves.
2. P0 safety blocker on integrating 01: inspect pending migration journal BEFORE app.js writes; explicitly quiesce v21 autosave/timer writers during migration; require consent and retain rollback. Data contract commitPlan is for migration/restore, NOT an arbitrary note-edit transaction. All existing note writers must share a verified edit protocol before activating PR #7.
3. P1: merge exact verified branches with file ownership. Wire JS dependencies into index.html in order, and connect real user-facing UI calls (not merely script tags). Preserve numeric note/task IDs and all v21 storage keys.
4. P1: run QA tests at the final merged SHA and ensure the 00-owned workflow actually runs them. Current baseline workflow triggers on PRs to main and does not automatically test these draft feature PRs to recovery.
5. P1: complete A-H UI workflows, 320/360/393/430 widths, Arabic RTL/English LTR, 20 locales, long notes, mobile keyboard, XSS, quota, TalkBack and offline WebView checks.
6. P1: build integrated debug APK + unsigned AAB at one stabilized SHA, then install/upgrade on Android without clearing app data; verify primary/mirror, notes, drafts, session state, notifications, audio and backup restore.
7. P0 for production: independently confirm upload signing key, licensed media, Play rules and real-device release gates.

No merge, rebase, force push, workflow modification, production-file modification or change to lane 03 was made by QA.
