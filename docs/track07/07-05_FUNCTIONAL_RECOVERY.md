# TRACK 07-05 — Analytics invalid-range crash and stale export

Date: 2026-10-20. Canonical untouched base PR #73 SHA `a5d557813c4fa9bd0209e1a12d563e84a7064d56`.
Scope is the existing Analytics Studio view. No changes to recorded session ledger, v21 shape, task data, or integration-owned files.

## Reproduction — RED
- `analytics_studio.js` invokes `core.buildReport` directly after editing a date. A reversed or invalid range throws `RangeError` through the DOM event handler without user-facing validation.
- Previous valid report remains internally readable but the export button can export that stale range while invalid filters are displayed.
- Test `tests/track07_functional/analytics_date_guard.test.cjs` checks non-throwing date edits, accessible error message, no stale CSV export and recovery after a valid range.
- RED run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39424366937 — 52 existing PASS and 1 new FAIL.

## Minimal fix — GREEN
- Only application file `android/app/src/main/assets/web/analytics_studio.js`.
- Catch invalid-date `RangeError`, expose accessible validation without modifying last valid calculated report; disallow CSV for invalid date filters; resume normal analysis and export after valid input.
- GREEN run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39424528537 — 53 PASS, 0 FAIL, 0 SKIP plus JS syntax PASS.
- Real Android Analytics interaction, locale parity beyond the current Arabic/English strings, and SAF export: NOT_TESTED on this track.

## Handoff to 07-09
Integrate only independently reviewed studio fix and regression. Re-run integrated exact-SHA Node/Android acceptance. Maintain no fabricated sessions, no analytics data edits, and no change to `app.js`, `index.html`, `integration_v22.js`, `MainActivity.java`, or v21. No auto-merge; `RELEASE_APPROVED=NO`.
