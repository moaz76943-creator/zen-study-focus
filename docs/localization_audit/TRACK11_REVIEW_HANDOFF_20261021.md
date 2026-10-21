# Track 11 — Existing 20 languages: measured source gaps and review handoff

**Scope:** `en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl` only.
Original source base: [PR #138](https://github.com/moaz76943-creator/zen-study-focus/pull/138), `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5`.
No code in `android/app/`, v21, user data, runtime catalogs or future-language admission is changed in Track 11.

## What has actually been measured

Run `node tools/language_review/track11_review.cjs --out evidence/` **on the checked-out exact HEAD**.
The read-only reporter calls the established catalog auditor. Historical 4,626 cannot be treated as current without rerunning it; the independent exact-head CI on `19b17ac48296c191382c009ad51ef7c9ac28d0fd` measured:

- **4,626 explicit language/key gaps**, counted from source tables; *not 4,626 confirmed visual failures*.
- **92 unmarked source literal candidates**; classification and appearance require runtime inspection.
- **20 identical-to-English text candidates**, which may include legitimately untranslated proper names.
- **0 Eastern-numeral literals in audited source catalog values**, *not* a guarantee for program-generated numbers in SVG, CSV or native Android.

These numbers must be regenerated and may change after an integration-branch update. The scripts fail closed when the 20 selected languages, RTL directions or pinned SHA are invalid. The future 80 languages remain hidden; their draft review code is owned separately by PR #140 / the language-factory team.

## Evidence produced on every full Track 11 run

The read-only `track11-source-review-<SHA>` GitHub Actions artifact includes:

- `track11-coverage.json`: **all 20 languages × all inventoried screens**, with actual present/total/missing source keys.
- `track11-matrix.md`: readable per-language, per-screen counts and percentages.
- `track11-review-queue.csv`: one unapproved, empty translation cell per source gap, safe for spreadsheet review (spreadsheet formula injection escaped).
- `track11-triage.json`: source-static candidates, identical-English flags, numeral literal cases and unresolved HTML binding keys.
- `historical-auditor/coverage.json`, `proposals.json`, `REPORT.md`: canonical source analyzer evidence, not runtime translations.
- `SOURCE_SHA.txt`, TAP results and locale lint output.

The Chromium artifact includes exact SHA, `live-navigation-20-languages.json` (20 × **320/360/393/430px**), timer confirmation cases, Analytics interaction evidence, screenshot, and known limitations. Its browser is desktop Chromium loading packaged WebView files; it is **not** an installed Android app.

## Triage definitions: do not inflate "complete" translations

| Classification | Supported meaning | Next action |
|---|---|---|
| `EXPLICIT_CATALOG_GAP` | No literal translated value in the measured catalog for a key/locale | Review the real UI context; translated candidate requires a language reviewer |
| `UNMARKED_SOURCE_CANDIDATE` | Static HTML/JavaScript appears user-facing but lacks a recognized localized binding | Trace render path; label rendered vs unused |
| `NATIVE_REVIEW_REQUIRED_NOT_PROVEN_ERROR` | Candidate equals English | Linguist verifies if intentional |
| `REVIEW_LITERAL_CONTEXT` | A catalog literal contains non-Western digits | Distinguish a quote from a generated counter |
| `rendered: NOT_TESTED` | Source scanner has not clicked the screen/control | Requires real browser or Android proof |
| `fallback: NOT_VERIFIED` | Runtime fallback path not proven by source presence | Capture on-screen text under selected locale |

**Human review fields:** reviewer qualification, locale, screen route, key, exact base SHA and source English, screenshot/context, corrected translation (including placeholders and plurals), severity/critical action status, decision, review timestamp, reviewer signature/approval reference. The generated CSV intentionally contains no translated filler and grants no approval.

## Remaining release/acceptance gates

- Source: the dedicated workflow must PASS on the final candidate SHA; adding reviewed copy needs fresh regression tests.
- Chromium: 80 language/width combinations, rendered navigation, RTL/LTR and overflow; 20 localized destructive timer cancel cases; Analytics interactions, SVG accessibility and Western-digit CSV/source regression.
- Android **NOT_TESTED on this Track 11 SHA**: actual WebView 20-locale navigation, native dialogs/Toasts, process force-stop and reopen, restore/import and DocumentsUI data comparisons, TalkBack, text truncation at all target widths and device keyboard.
- Human translations **NOT_TESTED**: all Notes, Tasks, Goals, Timer, Analytics, Audio, Settings, Native alerts must be context-approved one by one.
- User-authored Arabic/Persian/Urdu texts and their original digits are preserved. Generated UI numerals should use Latin `0–9`; never rewrite stored notes/tasks or v21 exports to enforce it.
- Existing shared files and future-language registry are master-integration owned; do not auto-cherry-pick overlapping repairs. No auto-merge, no signing, no release.

**RELEASE_APPROVED=NO** until all applicable gates pass on an approved integration build.
