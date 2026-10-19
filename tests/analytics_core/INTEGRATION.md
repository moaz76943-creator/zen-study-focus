# Deep Focus REAL Analytics v21 — integration contract

Task: `DEEP-FOCUS-05-REAL-ANALYTICS`. Base: `fix/v21-safe-release-recovery-20261018` at `527d85978c8dfd3a3eab8aa8cfae199c4d541c8b`. Track 01 persistence contract: `feat/data-safety-v21-contract-20261019` / `docs/contracts/DATA_COMPAT_V21.md`.

## Files and startup
- `android/app/src/main/assets/web/analytics_core_v21.js`: UMD, no side effects. Browser: `window.DeepFocusAnalyticsV21`. Node: `require(...)`.
- `android/app/src/main/assets/web/analytics_studio.js`: optional UI, browser: `window.DeepFocusAnalyticsStudioV21`; Node export for SVG tests.
- Lane 00 includes the **core before studio** in the existing `index.html`, then passes a safe snapshot provider: `DeepFocusAnalyticsStudioV21.mount(host, () => ({cfg, tasksList, projects: []}), {locale: cfg.lang, goals: approvedDailyGoals, onExport: androidSaveCsv})`. The caller controls which part of the UI hosts this standalone component and when it refreshes.
- **No automatic localStorage access**, writes, migrations, timer hooks, backup-format edits, or modifications to shared `app.js` / `index.html` / `white_2100.css` in this lane. No Android/WebView bridge is presumed available. Without `onExport`, the studio attempts a browser Blob download; lane 00 should connect an Android Save As bridge if needed.

## API
- `normalizeSessions(sessionHistory)` -> `{sessions,rejects,duplicates,invalid,samples}`. Inputs are genuine v21 session records `{id,date,minutes,domain}`; `id` is opaque string or safe integer, typed distinctly. Exact duplicate ID: **first validated row wins**, later duplicate excluded from metrics but source unchanged. Reject missing/invalid ID/date, non-numeric, negative, >1440 or non-finite minutes, unsupported domains and explicitly marked sample/demo/fixture rows. `exam -> work`, `review -> read`.
- `buildReport({cfg,sessionHistory?,tasksList?,projects?}, {today?,startDate?,endDate?,domain?,goals?})` -> `{period,totals,daily,weekly,monthly,byDomain,streaks,goals,tasks,quality,sessions}`. Direct `sessionHistory` overrides `cfg.sessionHistory`; dates YYYY-MM-DD, inclusive. Default last seven credited local calendar dates. Valid activity filters: `all/study/read/work/sport`. Weekly buckets start Monday. Empty average is `null`; never derive sessions from `cfg.sessions` or minutes from `cfg.todayMins` because those aggregates have no reliable per-event detail.
- `yearHeatmap(snapshot,year,{domain?,today?})` -> full-year daily points (365 or 366) with zero-valued **empty dates**. Studio only visualizes after at least one validated session in that year.
- `taskReport(tasksList,projects,today)` -> counts of non-starter unique **numeric-ID** tasks, completion, explicit dueDate-based overdue, optional grouped projects. Legacy task `date` is scheduling metadata and is **not** assumed to be a deadline. Starter examples and duplicates are excluded from dashboard counts but never deleted. Projects only exist as real objects supplied by a future tasks adapter; no guessed projects.
- `toCSV(report,'sessions'|'daily'|'weekly'|'monthly')` -> RFC 4180 quoted values, CRLF, formula mitigation; unknown timestamps have empty cells. `onExport(csv,filename,mimeType)` hands the UTF-8 CSV to the integration layer.
- `DeepFocusAnalyticsStudioV21.mount(element,snapshotOrProvider,opts)` -> `{refresh,getReport,destroy,element}`. Returns accessible, keyboard-selectable SVG bars + year heatmap, domain/date inputs, real KPI cards and a CSV action. Uses DOM text nodes for user-visible dynamic text. It does **not** install or replace the existing analytics section.

## Historical time integrity and policy
- The original `date` is the credited local **calendar day**, never a reconstructed start time or a timestamp converted to another timezone. Multi-day real sessions remain attributed to the original credited date; no splitting is possible from legacy data.
- `startedAt` and `endedAt` are exposed only if both are valid offset-aware ISO instants or safe epoch milliseconds, ordered and no more than 24h apart, **and** the writer explicitly provides `timeEvidence: 'timer-monotonic-v1'`. This marker denotes a producer contract, not independently verified cryptographic proof. Lane 00 must verify the producer before enabling it; old sessions are never enriched retroactively.
- Current streak: one or more accepted sessions with **positive** minutes per consecutive credited local date, ending today or yesterday; longest streak across all accepted dates. Streaks are global even when the visible period/domain is filtered. Zero-minute completed history is still a session but does not extend a day streak.
- Goals are an explicit optional `{study: dailyMinutes,read: dailyMinutes,work: dailyMinutes,sport: dailyMinutes}`. For an inclusive N-day range, per-domain target = daily goal × N; no default goal is invented from focus presets.
- Peak clock hours, interruption frequencies, and historical sound usage are **not** calculated or displayed, because these events were not recorded. Quality counters disclose excluded, duplicate, invalid, sample, and timing-qualified records.

## Verified sample fixture
`v21.fixture.json`: 4 distinct accepted sessions = **115 minutes**, average **28.75 minutes**, by domain: study 25, read 20, work 40, sport 30; 1 duplicate, 1 demo, 2 invalid sessions excluded. Two real active tasks (one completed), one archived, one real project with 1/2 tasks done. No historical clock times invented.

## Local regression commands
```sh
node --check android/app/src/main/assets/web/analytics_core_v21.js
node --check android/app/src/main/assets/web/analytics_studio.js
node --test tests/analytics_core/*.test.cjs
TZ=Asia/Amman node --test tests/analytics_core/*.test.cjs
TZ=America/New_York node --test tests/analytics_core/*.test.cjs
```
17 Node tests cover legacy sessions, invalid/missing data, typed IDs, duplicates, day/week/month aggregations, streaks, explicit goals, tasks/projects, leap-year heatmap, DST, midnight, timezone independence, safe CSV and SVG validation. Actual Android UI compatibility, availability of native CSV export, performance under large on-device history and integration with lane 00 remain separate gates; none are claimed proven by isolated Node tests.

## Lane 00 handoff
1. Merge after data-compat lane 01 or reconcile imports at a common baseline; modules themselves do not import it.
2. Add both scripts to `index.html` only from lane 00, mount studio within the shared analytics section, and ensure refresh after session/task changes. Avoid rendering two competing graphs.
3. Add checks to shared CI and run existing smoke tests and Android build. Device-check WebView DOM/CSV Save As, accessibility, RTL and legacy backup restores.
4. No force push, no user data rewrite and no change to `com.zenstudy.focus` in this workstream.
