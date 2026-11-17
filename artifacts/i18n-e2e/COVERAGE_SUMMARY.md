# DF13-B — measured translation coverage

SOURCE_SHA: 671e0e09cf9011112875278f11f3a610a25739f7

Source dictionary: PASS 0 / FAIL 84 / NOT_TESTED 16

Android E2E: NOT_TESTED in this lane. Native resources: NOT_TESTED (no verified string key inventory).
en/ar registered-family coverage() returns true unconditionally: this is NOT sufficient translation evidence.
English-identical strings and duplicate labels are REVIEW candidates, not automatic machine-approved translations.

| Section | PASS | FAIL | NOT_TESTED | Missing | Empty | Fallback | English-identical candidates |
|---|---:|---:|---:|---:|---:|---:|---:|
| Timer | 34 | 64 | 2 | 688 | 0 | 710 | 0 |
| Tasks | 43 | 55 | 2 | 3511 | 0 | 3639 | 0 |
| Notes | 53 | 45 | 2 | 1620 | 0 | 1692 | 0 |
| Goals | 42 | 56 | 2 | 786 | 0 | 816 | 0 |
| Analytics | 43 | 55 | 2 | 935 | 0 | 969 | 0 |
| Analytics Domain | 46 | 52 | 2 | 158 | 0 | 166 | 0 |
| Core | 2 | 80 | 18 | 8400 | 0 | 8400 | 78 |
| Quick Training | 95 | 2 | 3 | 72 | 0 | 72 | 3 |
| Native | 0 | 0 | 100 | 0 | 0 | 0 | 0 |

## Source ownership (proposed D/E/F repair lanes)
D: Timer / Goals. E: Tasks / Notes. F: Analytics / Core / Quick Training / Native audit.
Only the validator was changed. Translate in the indicated owner files, not here.
Native source-file assignment is unavailable until an authoritative key inventory exists.

Individual language and key details: PER_LANGUAGE_COVERAGE.json, MISSING_TRANSLATION_KEYS.json, TRANSLATION_REPAIR_QUEUE.json.
