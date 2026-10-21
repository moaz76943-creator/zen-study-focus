# Track 10 — Analytics evidence and integration handoff (2026-10-21)

**Decision: RELEASE_APPROVED=NO. No automatic merge.** This is a review-only patch based on PR #138's integration head `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5`. No real user data, v21 keys, Android Java, signatures, shared integration files or `main` were edited.

## Proven problem and fix

- **RED**: [Actions 39593191051](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39593191051), test-only SHA `0341023dd96c6d042c12dc6f54d83d0ccd31ef62`: 2 new failures, 6 existing passing tests. Invalid range left Studio Export CSV enabled; late native SAF save receipt re-enabled it after date validity changed.
- **GREEN**: [Actions 39593294005](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39593294005), app patch `13bec50a7c16d917cbd90f34905b9bb64115737d`: 8 focused PASS, 667 Node PASS, Python PASS.
- **Regression+extended tests**: [Actions 39593684811](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39593684811), test+app SHA `1c3dd5a451bbf045ae3ac88371744c5f19641964`: 11 focused PASS, **670 Node PASS, 31 Python PASS**, Chromium job PASS (20 locale Analytics cases, five generated-number screens, 0 browser errors, 18 responsive cases, 0 responsive failures). No Android job in this workflow.
- A test-only CSV CRLF assertion was corrected in a subsequent test commit, without production logic changes. Failures of that malformed test must not be labeled an application defect.
- Only production edit: `android/app/src/main/assets/web/analytics_studio.js`. Invalid date refresh disables export; successful validation enables it only if native export is not in progress; native callback completion retains disabled state when date range is invalid.

## Reproducible source CSV comparison

Data: 10,000 independently ID'd genuine 1-minute sessions over 2026-10-18 and 2026-10-19; 1 duplicate ID with 900 minutes, 1 demo 600-minute record. Both Analytics core paths report **10,000 accepted sessions and 10,000 recorded minutes**. Source report identifies one duplicate and one sample. Studio CSV contains header plus 10,000 session rows; reading every CSV minutes cell totals 10,000. Input array remains 10,002 records and is not rewritten. Western digits check PASSES. A separate test proves 2026-03-29 Europe/Berlin credited day remains unchanged across a DST-boundary timestamp, leap day 2028-02-29 contributes correctly to 366-day heatmap, and reversed date range rejects. These are **source/unit** assertions, not physical Android or native file round-trip tests.

**Historical Android SAF proof, not transferable:** PR #134 [run 39566813581](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39566813581), QA `c73dcddf71726e6996a389a0915386afd3e92dad` tested **app** `7c4decaf34e322e01ebab4a3cf44b62b3def4156` in disposable API30. Actual DocumentsUI Cancel -> `cancelled`, Save -> `saved`, 80-byte exported CSV readback with Western numerals. It did **not** test the present PR branch or the 10k dataset. On current PR, real native SAF, storage denial, deleted destination and ENOSPC are NOT_TESTED.

## Controls verified on Chromium (not native touch)

| UI engine | Control/interaction | Evidence status |
| --- | --- | --- |
| Recovery UI (en/ar) | Domain filter, grouping, invalid and repaired dates | PASS, Chromium 20-language workflow |
| Recovery UI (en/ar) | KPI Today, Last 7 Days, Last 30 Days, Selected | PASS, Chromium outcome assertions |
| Recovery UI (en/ar) | Reset, chart bar drilldown, activity donut drilldown | PASS, Chromium outcome assertions |
| Recovery UI (en/ar) | CSV duplicate click/await `saved` with stub adapter | PASS, Chromium only; native picker NOT_TESTED at new SHA |
| Studio UI (18 other locales) | Domain/grouping/date filters, SVG day detail, CSV stub callback | PASS, Chromium |
| Studio UI (18 other locales) | Invalid-range disabling while no export and while native result is pending | PASS, Node regressions |
| Studio UI (18 other locales) | Quick Today/7/30 KPI buttons, Reset, donut detail | **MISSING / NOT_IMPLEMENTED**, unlike Recovery UI; do not claim parity |
| Both | 20 separate localized renders, RTL fields, generated digits on 5 screens | PASS, Chromium; native dynamic locale switch NOT_TESTED |
| Both | Android touch and keyboard screen reader/TalkBack | NOT_TESTED at this SHA |

**Material architectural gap**: `integration_v22.js` selects `analytics_recovery_ui.js` for en/ar and `analytics_studio.js` for the other 18 languages. They share canonical session normalization but are different presentation and CSV schema paths; `analytics_core_v21.js` delegates normalization to `analytics_recovery_core.js`. A truly unified screen/CSV contract needs independent product/i18n design review with the PR #138 owner. This patch intentionally does not overwrite shared `integration_v22.js` or invent unreviewed 20-language translations.

## 12 acceptance requests: truthful disposition

1. Canonical analytics source across all 20 locales — **PARTIAL** (common normalized source; still two UIs and different exported columns).
2. All KPI/cards/filters/buttons — **PARTIAL** (tested actual named controls above, full control parity missing).
3. Today/7d/30d/Custom — **PARTIAL** (recovery UI verified; Studio lacks quick presets; date inputs work).
4. Reversed date and delayed native receipts — **PASS source** (new RED/GREEN); Android delayed native receipt **NOT_TESTED**.
5. Charts/SVG/ARIA/touch — **PARTIAL** (source a11y regressions and Chromium click; real native touch/TalkBack **NOT_TESTED**).
6. Western digits in graphs and CSV — **PASS source/browser**; current Android readback **NOT_TESTED**.
7. No synthetic or duplicated focus minutes — **PASS source** 10k case; on-device persisted history **NOT_TESTED**.
8. 10k, DST, timezone — **PASS source correctness**; 10k physical UI/performance and changing timezone **NOT_TESTED**.
9. Android DocumentsUI Cancel/Save/Readback — **HISTORICAL PASS at PR #134 app SHA only**; current PR **NOT_TESTED**.
10. Deleted file, permission denial, ENOSPC — **NOT_TESTED**.
11. 20 languages and hot switching — **PASS separate Chromium mounting**; native live chart hot switch **NOT_TESTED**.
12. Data persistence/no record modification — **PASS source fixture untouched, no write code changed**; real force-stop and full restore **NOT_TESTED**.

## Handoff / conflicts

- PR #138 touched `android/app/src/main/assets/web/app.js` but **not** `analytics_studio.js` in the changed-file list checked on 2026-10-21. This PR intentionally owns only the Studio code, new test and isolated CI/documentation. Before integration, recheck both heads, any newly overlapping source and their checks.
- Independent Android API30+ SAF Cancel/Save/File Readback must be repeated on the **final integrated application SHA**, including nonempty known 30-minute/CSV rows and denied-write/low-storage cases. Do not infer this from 80-byte historical export.
- Detailed screen parity/locale strings and chart drilldown need a separate reviewed follow-up, not a speculative translation or shared-engine rewrite.
- No changes to `com.zenstudy.focus`, `ZEN21::`, v21 keys, ID or stored notes/tasks/sessions, live user records, `main`, release signing or approved audio. Safe rollback: do not merge this draft, or revert this narrowly scoped commit on its topic branch after review.
