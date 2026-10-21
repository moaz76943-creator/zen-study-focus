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
- `track11-native.json` and `track11-native-review.csv`: exact Java source inventory for all 20 existing locales, no translations activated. At the initial Track11 SHA, **12 native static text candidates × 20 locales = 240 reviewer rows**; newer Track12 source admission added **dynamic** Java notification/dialog callsites, which Track11 inventories separately and includes in reviewer rows after integration. Always regenerate and use exact current HEAD counts.

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
- Android API30 emulator: the separate `track11_real_android_20261021.yml` must pass on the final SHA before claiming a live WebView locale check. It covers actual installed WebView locale switching, chart ARIA, generated timer digits, synthetic authored-text DOM preservation, force-stop/reopen and a checksum-valid **synthetic ZEN21 code restore**. This does **not** cover a physical phone, file-based SAF restore, TalkBack, native dialog translations, actual user-content retention or every width on Android.
- Human translations **NOT_TESTED**: all Notes, Tasks, Goals, Timer, Analytics, Audio, Settings, Native alerts must be context-approved one by one.
- User-authored Arabic/Persian/Urdu texts and their original digits are preserved. Generated UI numerals should use Latin `0–9`; never rewrite stored notes/tasks or v21 exports to enforce it.
- Existing shared files and future-language registry are master-integration owned; do not auto-cherry-pick overlapping repairs. No auto-merge, no signing, no release.

**RELEASE_APPROVED=NO** until all applicable gates pass on an approved integration build.

## Integration proof gates and manual translation admission

The original 20 languages are separate from the 80 future candidates. Draft strings never enter Android runtime from these reviewer artifacts. Source-language fallback in Notes Studio, Tasks Studio, Goals Studio and Timer Settings is known to use an Arabic/English branch for many labels; resolving the remaining 18-language gaps requires context-approved copy, not replacing existing UI values with guesses.

The Android gate uses only a new disposable `com.zenstudy.focus` debug install inside a GitHub-hosted API30 emulator; it never connects to the owner's device and never logs backup payloads. Its `backup` probe replaces the browser confirmation only inside this disposable QA session to validate a synthetic checksum-valid `ZEN21::` code round-trip. The actual Android DocumentsUI SAF path is **NOT_TESTED** in Track 11 and remains owned by the data-preservation track.

Exact-SHA CI, human review and owner approval are mandatory; a previous commit's green test cannot be carried to a later application-source change. `RELEASE_APPROVED=NO`.

## Compatibility with newer master recovery source

When the master recovery branch contains Track12's expanded Java source scanner, `track11_native_review.cjs` generates contextual review rows for both literal and dynamic Java messages. Each dynamic entry retains its expression, cannot be treated as approved translated copy, and must be assessed in the JS-to-Java calling context. Report counts can therefore increase above the original 240 rows. Both Track11 workflows run on pushes to `integration/master-recovery-20261021` so evidence must reflect the actual **post-merge SHA**. A healthy PR-head check alone does not establish integrated source fitness.
