# Deep Focus: safe 100-locale admission — review only

This registry contains **100 target languages in total**: the 20 existing app languages unchanged plus 80 candidates. It is **not** 100 completed translations, and no new language is selectable. Hebrew is excluded. Administrative English language names are NOT approved translations of names in each native language.

The existing app has multiple distinct dictionaries (main app, premium, tasks, notes, training, analytics, sounds, dialogs, Android UI). The 20 existing languages have known untranslated content; parity of a small language table is not UI completeness. Language population ranks differ across methods; the priority set covers widely spoken written languages and is not an audited exact world rank.

## Commands

Run at repository root:
- `node --test tests/localization_20/locale100_gate.test.cjs`
- `node tools/localization_100/guard.cjs --check`
- `node tools/localization_100/guard.cjs --template sw > /tmp/sw-draft.json`
- `node tools/language_review/audit.cjs --out /tmp/df-locale-audit`

The template emits all known canonical English source keys with **null** translations, never machine-generated filler. The source SHA256 inventory guard invalidates stale packs. Review each translated string's context, plurals, tokens, grammar, native OS labels, dynamic dialogs and accessible graphs. Source-identical text needs explicit reviewed exemptions.

Each language requires human native-linguist approval, full screen/dialog/notification/backup/export coverage, 320–430px phone UI, RTL/LTR and script checks, 0–9 generated digits, offline reload, TalkBack, real Android WebView + SAF interaction, and unchanged user-authored notes, tasks and storage v21. Every review gate and a matching exact-source hash must pass. Semantic accuracy cannot be established by Node tests alone.

Source inventory is a **starting point**, not a complete runtime DOM extraction. Current change does not touch app.js, index.html, v21 data, active UI or app language switching. Do not add unreviewed entries to runtime LANG_CATALOG. Integration owner must separately wire each independently certified locale into the app, with own Android evidence and manual review; no automatic merge, release or translation.

Unicode locale-identification reference: https://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code

**Current status:** 100 registered | 20 existing unchanged | 80 planned/not selectable | 0 new certified | full Android and translation review NOT_TESTED | production release NO.
