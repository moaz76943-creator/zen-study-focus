# DEEP FOCUS — 100-language localization

## Sources of truth
| File | Role |
|---|---|
| `i18n/languages.json` | Official 100 languages (BCP-47 base code, script, direction, CLDR plural categories, review status). Hebrew is permanently excluded. Dari (`prs`) is kept as a regional variant of Persian and not counted. Javanese is `jv` (the app catalog keeps its legacy code `jw`). |
| `i18n/source_en.json` | English source catalog. The normalized English UI text is the stable key (gettext style); numbers become `{0}`, `{1}`… Built by `tools/i18n/build_source.cjs` from the real running app (`tools/i18n/runtime_inventory.cjs`), toast literals and the Flashcards UI. |
| `i18n/packs/<code>.json` | Translations per language + `status` + `translator`. Edit these. |
| `android/.../web/locales/ui/<code>.js` | Generated runtime packs (`node tools/i18n/build_packs.cjs`). Only the active language is loaded. |
| `i18n/COVERAGE.md` | Generated coverage table (`node tools/i18n/coverage.cjs`). |

## How it works at runtime
`i18n_ui_catalog.js` runs after the older dictionaries (DICT, DF99 reviewed packs, DF22, locale rows…). Anything they
already translated is left alone; any English UI string still visible is translated from the active pack. User content
(notes, tasks, flashcard text, inputs, contenteditable, `[data-no-translate]`) is never touched. All digits are Western.
Changes are reversible (the English original is remembered per node), so switching languages never compounds.
`DFUiCatalog.report()` lists strings that were seen but have no translation.

## Review status (honest labels)
`source` · `human-reviewed` · `native-speaker-reviewed` · `expert-reviewed` · `ai-pending-review` · `machine-unverified`.
A reviewed status requires `reviewEvidence` in the pack (enforced by `tests/i18n_catalog.test.cjs`).
All packs written in this project so far are `ai-pending-review` (translated by Claude, not checked by a person).

## Adding or fixing a translation
1. Edit `i18n/packs/<code>.json` (or write `index|translation` lines and run `node tools/i18n/tsv_to_pack.cjs <code> file.tsv`).
2. `node tools/i18n/build_packs.cjs && node tools/i18n/coverage.cjs`.
3. `node --test tests/i18n_catalog.test.cjs`.
New UI text: run the runtime inventory + `build_source.cjs`; coverage then shows the new missing keys for every language.

## Known limits
- The inventory is taken from the default state of every screen and modal; strings that only appear in rarer states
  (running timer, some errors) are added as they are found. Toast literals are included from source.
- Demo/sample content (sample notes, reading-trainer sample text, sample tasks) is content, not UI, and is not in the catalog.
- Plurals: placeholders are positional; forms that need CLDR plural selection are written in a neutral form for now.
