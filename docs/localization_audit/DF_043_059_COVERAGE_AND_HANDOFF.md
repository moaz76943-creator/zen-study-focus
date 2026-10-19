# DF-043–059 — 20-language localization recovery audit
Date: 2026-10-19 (Asia/Amman)  
Baseline: `632ef51ae6034224e6b459e0962a8bbedbf2b18e` (`fix/v21-safe-release-recovery-20261018`)  
Work scope: additive module, tests, and audit docs **only**. No shared module edited.

## Verified repository facts vs. incomplete UI verification

- `app.js:91–112` exposes 20 language codes including `ar`, `fa`, `ur`; `app.js:238–295` builds 17 language rows from `locale_rows.js` and `locale_extras.js`.
- `locale_premium_v22.js` already provides 22 keys × 20 languages in a separate registry; the new **additive** recovery module provides **29 additional analytics-related keys × 20 languages = 580 non-empty strings**, without silently removing a language. This is **not** proof all app screens are localized.
- Baseline `tests/validate_locales.cjs` checks 47 shared keys for 17 supplemental locale rows and runtime DICT shape for 20 languages. It does **not** prove UI behavior.
- `analytics_studio.js:41–62,96` chooses only Arabic vs English, including chart grouping, domains, excluded-session label. It must accept the new 29-key translation adapter via lane 00 before users see the 20 translations.
- `tasks_studio.js` has only `ar`/`en` dictionaries, and its `mount` selects `adapter.locale==='ar'`. All 18 other languages fall back to English. Independent task translation keys and injected adapter are still needed.
- `notes_editor_ui.js:199` uses Arabic/English only, and an unknown key may be emitted as visible text. Refactor localization through a canonical resolver in the owning lane.
- `timer_settings.js:2–10` has an Arabic/English-only text selector. `quick_training.js:53` has its own per-language translator but `quick_training.js:347,354` retains English/Arabic dynamic labels.
- `app.js:523–544` visibly switches the base DICT but also rewrites titles/bodies for `isStarter` entries. The integration owner must prove this cannot overwrite user edits to starter records; no such changes are made in this branch.
- `index.html` contains unannotated static English dialog and note-editor UI labels; all active dialogs/attributes and Android TalkBack need a full DOM inventory.
- `MainActivity.java:138,178–182` emits **English** Android Toast messages for unavailable document picker, saved backup, and save failure. Native resource string localization and locale-propagation bridge are **integration pending**.
- `integration_v22.js:169–174` re-mounts Tasks/Analytics when the language changes, but the existing studios still fall back to English for 18 languages.
- PR [#12](https://github.com/moaz76943-creator/zen-study-focus/pull/12) is Draft. It filters `ar/fa/ur` and forces English in critical flows; these portions **MUST NOT be merged**. Its overlap includes `app.js`, `index.html`, `integration_v22.js`, `MainActivity.java` and `analytics_studio.js`. Lane 00 owns the reconciliation.

## Twenty-language translation coverage

This table measures **only the 29 NEW recovery-module keys**. `NOT VERIFIED` means full rendered Android app and screen-reader/browser tests have not run; it is not an untranslated-languages judgement.

| Code | Native name | UI direction | Recovery module keys | Entire app on device |
| --- | --- | --- | ---: | --- |
| en | English | LTR | 29/29 | NOT VERIFIED |
| ar | العربية | RTL | 29/29 | NOT VERIFIED |
| es | Español | LTR | 29/29 | NOT VERIFIED |
| zh | 中文 | LTR | 29/29 | NOT VERIFIED |
| hi | हिन्दी | LTR | 29/29 | NOT VERIFIED |
| fr | Français | LTR | 29/29 | NOT VERIFIED |
| de | Deutsch | LTR | 29/29 | NOT VERIFIED |
| ru | Русский | LTR | 29/29 | NOT VERIFIED |
| pt | Português | LTR | 29/29 | NOT VERIFIED |
| ja | 日本語 | LTR | 29/29 | NOT VERIFIED |
| id | Bahasa Indonesia | LTR | 29/29 | NOT VERIFIED |
| tr | Türkçe | LTR | 29/29 | NOT VERIFIED |
| ko | 한국어 | LTR | 29/29 | NOT VERIFIED |
| vi | Tiếng Việt | LTR | 29/29 | NOT VERIFIED |
| it | Italiano | LTR | 29/29 | NOT VERIFIED |
| bn | বাংলা | LTR | 29/29 | NOT VERIFIED |
| ur | اردو | RTL | 29/29 | NOT VERIFIED |
| fa | فارسی | RTL | 29/29 | NOT VERIFIED |
| pl | Polski | LTR | 29/29 | NOT VERIFIED |
| nl | Nederlands | LTR | 29/29 | NOT VERIFIED |

**Known missing/unintegrated UI groups:** Tasks Studio (18 locale fallbacks; ~50+ labels per locale), Notes Editor (18 locale fallbacks), Timer Settings (18 locale fallbacks), old Analytics Studio (18 fallbacks), static HTML dialogs, generated toasts/validation/success/error labels, calendar controls, backup/import/export messages, native Android toasts/notification strings, chart SVG accessibility descriptions, real-device all-screen snapshots. Precise per-screen string counts require a rendered DOM extraction test after lane 00 integration; do not imply zero missing strings.

## New additive runtime contract

File: `android/app/src/main/assets/web/localization_20_recovery.js`

- Exports `DeepFocusLocale20Recovery` (browser) or CommonJS module (tests).
- `LANGUAGES`, `KEYS`, `translations`, `audit()`: strict parity checks with no blank keys.
- `t(code,key)` returns localized text or **null** for unknown keys, never the raw internal key.
- `westernDigits(text)` is **ONLY** for program-generated display text. **Do not apply to note/task bodies, IDs or stored user strings**.
- `formatNumber(number,code,options)` and `formatDate(date,code,options)` force `numberingSystem:'latn'` with fallback. Dates may use native weekday/month names.
- `apply(root,code)` touches **only** `data-df20-i18n`, `data-df20-placeholder`, `data-df20-aria-label`, `data-df20-title` elements and a marked `data-df20-scope` container. It skips `data-df20-user-content` and contenteditable subtrees, does not change input values, and never rewrites `notesList` or `tasksList`.
- `createController({root,locale,persist,onChange})` notifies on live change and delegates persistence to a caller using the original safe v21 cfg transaction. It does **not** write localStorage, create another source of truth or auto-install.

### Integration handoff — only lane 00 may edit shared files

1. **Reject PR #12 language suppression** and preserve the exact `LANG_CATALOG` 20 options.
2. Load `localization_20_recovery.js` **after** existing locale modules in `index.html` and before UI consumers. Map the **29** keys to the real Analytics Studio labels and add native-language keys for other studios; do not replace all labels via blind `textContent` traversal.
3. Update the owning studios to accept an injected `t`/locale adapter, remove the bilingual-only selectors, and re-render open forms/modals after selected-language changes. Avoid data writes on language changes other than the existing cfg language setting.
4. Move Android-origin Toast/picker/export/notifier messages to localized `res/values-*/strings.xml` or a secure native locale bridge without additional permissions. Verify Android 13+ notifications if displayed.
5. Numeral policy on **all generated** UI/CSV/SVG/aria-labels: `0123456789`; use `Intl.*Format` with `numberingSystem:'latn'`, numeric bidi isolation (`dir=ltr`/`bdi`) where appropriate. Do not normalize the user's authored text.
6. Add real-device Android WebView snapshots for 20 locales × representative Notes/Tasks/Analytics/Calendar/Timer/Goals/Training/Sounds/Backups screens, switch while dialog open, reload/restore, long strings, and TalkBack. These are **pending**.

## DF-ID status (honest evidence gates)

| IDs | Status | Evidence / remaining blocker |
| --- | --- | --- |
| 043, 044 | PARTIAL | 20 codes retained; earlier broad Arabic-script suppression contradicted current requirement. Selected Arabic/Urdu/Persian remain supported; PR #12 must be corrected |
| 045 | PARTIAL | Controller persistence adapter tested; real cfg save/reload/backup integration not changed |
| 046–048 | PARTIAL | Source inventory above; some English-only hard-coded UI identified; real rendered all-screen audit pending |
| 049–051 | PARTIAL | 29-key strict parity and safe null behavior for new module; central dictionaries and legacy renderer still separate |
| 052–054 | PARTIAL | Western digit APIs and guarded RTL DOM apply tested; real SVG/timer/calendar/Android integration pending |
| 055 | PARTIAL | Live hook/control supported; dialog re-render in shared app pending |
| 056–058 | PARTIAL | Node test suite for 20 locales; narrow-device/screenshots/TalkBack/native UI pending |
| 059 | PARTIAL | New code never mutates user note/task text; integrated old starter mutation needs review |

## Test commands / evidence requirements

```bash
node --check android/app/src/main/assets/web/localization_20_recovery.js
node --test tests/localization_20/localization_20.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Existing Android CI's Python discovery includes `tests/localization_20/test_localization_20.py` (and the package `__init__.py`), which executes the Node suite. A passing PR job proves source-level contract only, **not live locale screens or Android device behavior**. No user data is migrated; no permission, signing or main-branch edits.
