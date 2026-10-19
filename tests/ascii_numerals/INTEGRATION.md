# DEEP-FOCUS-RECOVERY-05 — Lane 00 handoff (DF-060 to DF-069)

Base: fix/v21-safe-release-recovery-20261018 at 632ef51ae6034224e6b459e0962a8bbedbf2b18e. This branch owns only numerals_ascii_v21.js and tests/ascii_numerals/. Shared app.js, index.html, modules, and CI remain owned by integration lane 00. This PR provides a tested opt-in formatter, NOT global live UI coverage.

## Critical integration blocker

At the beginning of android/app/src/main/assets/web/app.js the existing global document input listener applies toWest to ALL INPUT and TEXTAREA values, silently changing user-authored notes, task titles and pasted backups. Lane 00 must REMOVE this legacy broad listener before activating any digit policy. Do not replace it with another global listener. Keep user text and v21 IDs/data exactly as entered.

## Required steps for lane 00

1. Include android/app/src/main/assets/web/numerals_ascii_v21.js via index.html before using its browser global: window.DeepFocusAsciiNumeralsV21. Node uses require(). Module import does not modify DOM or storage.
2. For counter leaf elements (timer rounds, minutes, tasks, notes, goals, analytics KPI), explicitly use renderNumber(element, numericValue, {locale:cfg.lang}), formatTimer(seconds), or formatPercent(percentage). For a localized calendar date label use formatDateLabel(isoDay,{locale:cfg.lang}); do not modify the ISO date key.
3. Mixed RTL lines: use a separate bdi numeric leaf or generated element with dir=ltr and unicode-bidi:isolate. Never change direction or digits of free-text notes/task titles.
4. For rendered SVG ticks, legends, tooltips and aria-labels: mark only generated numeric leaves with data-df-generated-number; update data-df-raw-number for source-backed numeric values; call refresh(svg,{locale:cfg.lang}). Never mark a user-authored note or task label.
5. For explicit numeric controls only (durations, rounds, numeric goals, inpPagesLeft, inpDailyRate), set data-df-numeric-input; call wireNumericInputs(document) after their mount. No listener on textareas, title fields, backup input or searches.
6. For report CSV exports use serializeCsv(records, schema), with schema kinds number/date/text. Number/date cells are invariant 0-9 and decimal point; user-authored text cells retain their original script and digits. Do not rewrite whole exported blobs.
7. Refresh after first render, tab switching, updates, timer resume, locale changes and restoring a backup. Also mark/use APIs when creating dynamic nodes.
8. Review Gemini local/uncommitted work before adopting changes. An Android phone, actual WebView RTL screenshots, 20-locale live DOM, TalkBack and real SAF CSV export must be separately verified by QA.

## API examples

    const n=window.DeepFocusAsciiNumeralsV21;
    n.formatNumber(1234,{locale:'fa'});       // 1234
    n.formatTimer(5);                         // 00:05
    n.formatPercent(100,{locale:'ar'});       // 100%
    n.renderNumber(kpi,25,{locale:cfg.lang});
    n.wireNumericInputs(document);            // opt-in inputs ONLY

## Test and status

TDD RED: suite failed with MODULE_NOT_FOUND prior to implementation. GREEN: 12/12 Node tests and Python wrapper locally passed. Node command: node --test tests/ascii_numerals/*.test.cjs. Syntax: node --check android/app/src/main/assets/web/numerals_ascii_v21.js. Python CI discovery: python3 -m unittest discover -s tests -p 'test_*.py' -v. Shared CI Python discovery should find the wrapper; lane 00 may also add direct Node suite to its own workflow.

Unit tests cover ar/fa/ur, Western digits including 0/9/10/25/100/1234/-2/0.75, 2026-10-19, 00:05, Intl fallback, SVG text/title/aria, RTL bidi, numeric input opt-in, free-text preservation, invariant CSV, repeat refresh and nested content safety.

DF-062/067 isolated formatter: TESTED. DF-064 preservation: TESTED in isolation. DF-060/061/063/065/066/068/069: IN_PROGRESS until live DOM/SVG/CSV integrations and device tests; no production approval.
