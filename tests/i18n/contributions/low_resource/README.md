# DF-LANE-23 — Low-resource language QA (batch 01)

The 99-language catalog contains `haw`, `hmn`, `sm`, `su`, `jw`. Standard Javanese code is `jv`; the app uses legacy `jw` and this lane does not change runtime identifiers.

Canonical scope is 147 keys per language (six families). Each file contributes exactly two short **source-backed terminology candidates**, the Save control at `timer.8` and `tasks.save`. These are **not native-speaker reviewed** and have `REVIEW_REQUIRED` status. The manifest records the exact other 145 missing keys for every language, source URLs and fallback policy; never count fallback as translation. No application code, storage keys or central reviewed packs have been changed.

Hawaiian terminology comes from a computer-program dictionary entry. Sundanese and Javanese use WordPress UI-localized vocabulary. Hmong and Samoan have only dictionary-level evidence and require particular native-review attention.

Before promoting, check native tone, Hawaiian ʻokina/kahakō, Hmong RPA, Samoan diacritics, Android installed font and rendering across 320–430px, placeholder safety and language-switch behavior.

Run: `node --test tests/i18n/contributions/low_resource/contributions.test.cjs`.
