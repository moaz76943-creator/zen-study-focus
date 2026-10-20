# TRACK 07-03 — Western numeral leak (Hindi/Bengali)

BASE_SHA: `e8a98d334e694ed3c872d5c2de51d12986bb5a84` (PR #74)
TRACK_ID: 07-03
RELEASE_APPROVED=NO

## Confirmed RED
PR #74's `westernDigits` converted Arabic-Indic U+0660 and Persian U+06F0
but returned unmodified Hindi Devanagari U+0966 and Bengali U+09E6 digits:
`०१२३४५६७८९` and `০১২৩৪৫৬৭৮৯`.
That breaks the generated-display numeral helper contract for the 20-language UI.
The defect is in the helper's general input handling; it is NOT proof that
an Android screen previously displayed these digits.

## Narrow patch
- Extend ONLY `westernDigits` to cover U+0966–096F and U+09E6–09EF.
- Keep existing Arabic/Persian behavior, all 20 catalog entries, RTL, language codes and formatting.
- `apply()` remains constrained to UI-marked elements and excludes authored content.
- No stored notes/tasks, schema v21, `app.js`, `index.html`, Java or integration branch edits.

## Tests and gates
- RED: direct V8 execution against exact PR #74 module reproduced two failed conversions.
- GREEN: direct V8 execution of patched module passed four 0–9 scripts, 20-language catalog audit.
- Regression: `node --test tests/localization_20/western_digits_indic.test.cjs`.
- Existing suite: `node --test tests/localization_20/*.test.cjs`; `node tests/validate_locales.cjs`.
- Exact-HEAD GitHub Actions, Node suite and Android rendered 20-language smoke: NOT_TESTED.
- Full 4608 missing locale/key pairs unchanged. Do NOT treat this as translation coverage closure.
- Human translation approval remains mandatory; no automatically proposed translations inserted.

## HANDOFF_TO_07_09
Standalone reviewed child of PR #74. Integrator can inspect two changed
source/test files and cherry-pick only this narrow patch after Track 07-00 P0
durability acceptance, avoiding duplicated cherry-picks of #74 already staged
in PR #79. No auto merge, no production release.
