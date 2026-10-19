# DEEP-FOCUS-RECOVERY-09 — truthful analytics, DF-121–DF-137

**Source of truth:** GitHub issue #13. **Approved immutable base:** 632ef51ae6034224e6b459e0962a8bbedbf2b18e (recovery branch, 2026-10-19). **Handoff:** lane 00 / Master QA lane 11. **Scope:** newly added analytics recovery modules and tests/docs only. **Status:** independent implementation, NOT wired into production or approved for release.

## Live-source investigation

- Existing `analytics_core_v21.js` and `analytics_studio.js` already implement v21 history reads and basic day/week/month aggregations. Their output and old files remain untouched; do not install **two** competing UIs.
- Current real completion writer in `app.js` appends `{id,date,minutes,domain,mode:'focus',completed:true,taskId?}` to `cfg.sessionHistory`; historical v21 records may only have `id,date,minutes,domain`. Their date is a credited *local calendar day*, NOT a recorded start time.
- Never use `cfg.todayMins`, `cfg.sessions` or `cfg.streak` as substitutes for granular history, and do not infer active time from fixed focus presets.
- PR #12 `fix/audio-english-analytics-20261019` is a conflicting open draft: it edits `analytics_studio.js`, `integration_v22.js`, `app.js`, `index.html`, `MainActivity.java`. Its Android `exportAnalyticsCsvToFile` is a one-way JavaScript interface; `onActivityResult` only sends a Toast and does not acknowledge write/cancel/failure to JavaScript. **A Toast or opening the SAF picker is NOT proof of a saved CSV.** PR #12 also suppresses ar/fa/ur; do not merge it as-is.
- The legacy packet keys `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21`, mirrors, and `ZEN21::` backups are sacrosanct. New modules perform no storage reads/writes, migration, timer credit or backup replacement.

## Added modules

`analytics_recovery_core.js` (UMD, `window.DeepFocusAnalyticsRecovery` or CommonJS):
- `normalizeSessions(history)` -> `{sessions,rejects,quality}` with typed ID deduplication; **first valid row wins**. For duplicate IDs, identical accounting gets `DUPLICATE_ID` and conflicting date/minutes/domain gets `CONFLICTING_DUPLICATE`; source arrays are never changed.
- Excludes invalid dates/minutes/IDs/domains, sample/demo/test flags and explicit rest, cancelled, paused or incomplete modes/status. Missing old status is **unknown, not automatically false**: historical content cannot retrospectively prove it was completed. Durations 0..1440 accepted; zero minutes do not extend streaks.
- Only exposes recorded `startedAt`/`endedAt` when both offset-aware and `timeEvidence:'timer-monotonic-v1'` is present. Does not move credited dates across midnight.
- `buildReport(snapshot, options)` -> selected `period`, `sessions`, `daily/weekly/monthly`, `totals`, `byDomain`, `dashboard.today/last7/last30`, `comparison`, `streaks`, `goals`, `quality`. All aggregates derive from the ONE supplied `cfg.sessionHistory` or explicit `sessionHistory` override.
- Comparison is **rolling last 7 credited dates ending at the filter end** vs the immediately preceding 7 credited dates, equal denominators (7+7); no hard-coded gains. If previous total is zero, percent change is `null`, not infinity or 100%.
- `goalSnapshots` must consist of pre-existing dated original-target records `{date,domain,targetMinutes}`, supplied explicitly through the snapshot or opts. Targets use **only days with genuine snapshots**, report coverage, and never extrapolate today's mutable goal into history. Until such snapshots are recorded in production, the historical goals UI honestly says unavailable.
- `taskId` navigation requires a stable numeric task ID and a unique non-starter, non-archived task in the snapshot; absent/ambiguous links have no actionable button.
- `toCSV(report, kind)` produces filtered RFC-4180 CRLF CSV (sessions/daily/weekly/monthly) with consistent ASCII 0-9 generated figures, escaped quotes, spreadsheet formula mitigation, and blank unknown timestamps.
- `createExportController(async saveCSV)`: locks overlapping requests; awaits an explicit `{status:'saved'|'cancelled'|'failed'}` result; thrown errors and unverified responses yield `failed`. **It does NOT consider a JavaScript-to-Java call returning `undefined` a success.**

`analytics_recovery_ui.js` (UMD, `window.DeepFocusAnalyticsRecoveryUI`):
- `renderBarsSvg(series)`: bounded SVG with numeric Y-axis ticks, credited-period labels, safe escaped tooltips, keyboard focus, button semantics, real data-bucket identifiers and ASCII numerals.
- `mount(host, () => snapshot, opts)` -> `{refresh,getReport,destroy,element}`; explicit opt-in only. Date/activity/grouping filters, reset, working daily/weekly/monthly SVG drilldown, real session table, dashboard KPI buttons that switch to real date ranges, activity split, date-snapshot goals, exclusion and conflict disclosures.
- Export button is **disabled** until `saveCSV` is provided, and announces verified saved/cancelled/failed asynchronously. No decorative fake export. No fake psychological "focus quality".
- For all non-English locales, `opts.translate(key,locale)` is REQUIRED and missing keys fail closed rather than silently showing English. Keys take the form `analyticsRecovery.<name>` where `<name>` comes from the module's English fallback registry. Lane 04 must supply complete 20-language strings, preserving Arabic/Persian/Urdu; data/user-generated note/task text is never translated. SVG-generated numeric ticks remain 0123456789.
- No imports or writes to localStorage, no global click listeners, no mounting before explicit call. Long daily ranges (>365 bars) switch to monthly to protect WebView performance. Session table shows up to 200 rows plus an honest remaining count.

## Correct integration order — owned EXCLUSIVELY by lane 00

1. Reconcile PR #12 first. In the recovery integration branch, include `analytics_recovery_core.js`, then `analytics_recovery_ui.js` AFTER the existing platform core, and select a single analytics view. Do NOT edit `app.js`, `index.html`, `integration_v22.js`, `analytics_studio.js` or native Android source on this independent branch.
2. Wire the read-only existing application snapshot without mutating history:
   ```js
   const view = DeepFocusAnalyticsRecoveryUI.mount(host,
     () => ({cfg, tasksList, goalSnapshots: cfg.originalGoalSnapshots}),
     {locale: cfg.lang, translate: (key, locale) => complete20LocaleLookup(locale, key),
      saveCSV: verifiedAndroidSafAdapter});
   ```
   `originalGoalSnapshots` is illustrative, NOT a currently proven v21 field. If absent, OMIT it; never synthesize historical goals. Refresh on session credit and after successful restore, remount on locale change, destroy the previous view.
3. The Android `verifiedAndroidSafAdapter({csv,filename,mime})` must return a Promise. Resolve `{status:'saved'}` **only after** selecting the destination, writing and closing the output stream without error; resolve `{status:'cancelled'}` for RESULT_CANCELED; resolve/reject failure for picker errors, inaccessible URI, failed writes, full disk and destroyed Activity. Correlate callbacks by unique request ID, guard duplicate taps and lifecycle; never return success immediately when `exportAnalyticsCsvToFile` is invoked. Verify on a physical WebView device. This requires integration/native-file ownership and does not exist in the new JS module.
4. Localizations: lane 04 must add all `analyticsRecovery.*` keys to the 20-language registry and test RTL/LTR after hot switching; no suppression of `ar`, `fa`, `ur`. Host events/heading change via remount.
5. Add the new tests to shared CI, then run Android debug build, locale/screenshots, accessibility, Android SAF success/cancel/full-storage tests, import/restore and existing v21 smoke tests. Obtain human review before merge into recovery; never merge directly into `main` from this branch.

## Evidence and test commands

```sh
node --check android/app/src/main/assets/web/analytics_recovery_core.js
node --check android/app/src/main/assets/web/analytics_recovery_ui.js
node --test tests/analytics_recovery/*.test.cjs
TZ=Asia/Amman node --test tests/analytics_recovery/*.test.cjs
TZ=America/New_York node --test tests/analytics_recovery/*.test.cjs
node --test tests/analytics_core/*.test.cjs
node tests/smoke_app.cjs
```

**Session evidence from this independent lane:** 26/26 new tests evaluated against the GitHub-hosted module sources in an isolated JavaScript V8 harness. Includes a 10,000-valid-session dataset, hostile source fields and ambiguous task references plus duplicate, leap-year week buckets, explicit statuses, CSV safety, 7/30-day math, SVG drilldown, filter reset, export outcomes and non-English mount validation. This is NOT a claim of Node CI, Android build or physical-device test success. The test suite's actual Node execution and shared CI wiring are required before release.

## DF-121–DF-137 status matrix

| ID | Implemented testable behavior | Remaining gate |
| --- | --- | --- |
| DF-121 | Read v21 id/date/minutes/domain without fake timestamps | integrated restore/device |
| DF-122 | Typed ID dedup + conflicting duplicate count | check source conflicts on imported backups |
| DF-123 | Invalid/sample/rest/unfinished filters | old status absent is inherently unverified |
| DF-124 | No inferred historic start time | timestamp producer review |
| DF-125 | Today/last7/last30 dashboard | integrated app UX |
| DF-126 | Equal 7-day windows; undefined zero baseline | locale labels |
| DF-127 | Date/activity filters + reset | mobile date picker |
| DF-128 | Keyboard/click detail table from SVG/KPIs | physical touch/reader |
| DF-129 | Accessible SVG axis, tooltip, legends and drilldown | TalkBack/WebView |
| DF-130 | Explicit zero / no-goal states | screenshot UX |
| DF-131 | RFC4180 CSV and asynchronous save statuses | **BLOCKED: native SAF result callback; PR #12** |
| DF-132 | Verified task links only | task navigation adapter |
| DF-133 | 10k-record V8 validation | Android mid-range device performance |
| DF-134 | Credited-day leap day/week/streak calculations | multi-timezone Node/Android runs |
| DF-135 | Goal compare only with original dated snapshots | original target snapshots may not exist |
| DF-136 | Hidden chart / repeat mount / reversed date / reset controls | real app navigation tests |
| DF-137 | ASCII ticks and chart-generated numeric labels | 20-locale device audit |

**Do not mark issue #13 checkboxes completed solely on this scoped PR.** Integration, device testing, native feedback, 20-language parity and final QA are separate approval gates.
