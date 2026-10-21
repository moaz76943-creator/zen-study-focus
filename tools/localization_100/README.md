# Deep Focus: safe 100-locale admission — review only

This registry contains **100 target languages in total**: the 20 existing app languages unchanged plus 80 candidates. It is **not** 100 completed translations, and no new language is selectable. Hebrew is excluded. Administrative English language names are NOT approved translations of names in each native language.

The existing app has multiple distinct dictionaries (main app, premium, tasks, notes, training, analytics, sounds, dialogs, Android UI). The 20 existing languages have known untranslated content; parity of a small language table is not UI completeness. Language population ranks differ across methods; the priority set covers widely spoken written languages and is not an audited exact world rank.

## Evidence-based translation production

An unapproved first-pass **Swahili (`sw`) draft** exists at `drafts/sw.json`. It contains 88 candidate UI strings across Analytics, navigation, tasks, notes, sounds, timer, goals, calendar and settings. It is explicitly `DRAFT_TRANSLATION_NEEDS_NATIVE_REVIEW` and has **no runtime effect**. The CLI validates provided text against the exact current source inventory, catches stale sources, missing tokens, control characters, untranslated English copies, removed action icons, removed file-type abbreviations (CSV) and non-Western numeric glyphs. It reports coverage by catalog, always with `readyForRuntime:false`.

For the other 79 planned locales, generate a source template using `guard.cjs --template <code>` and fill actual candidate translations only after reviewing the intended screen. The validator does **not** insert fallback English as translation, fake linguistic reviews, or modify the existing 20-language selector.

### Review and promotion requirements

1. Rebuild the canonical English source inventory and compare its SHA256. A changed meaning invalidates dependent candidate wording for review.
2. Translate every screen in context: buttons, cancellation and confirmation, errors, plural forms, percentage, time, accessibility labels, Android dialogs and export descriptions. Preserve action meaning, icons and interpolation variables.
3. Have a fluent/native reviewer independently verify against real screenshots, and attach source/review commit, reviewer notes, corrections and accepted exceptions. A self-declared `PASS` in JSON is not evidence.
4. Independently test exact-head Android/WebView and 320–430px layouts, RTL/LTR, native touch, offline, restart, stored v21 data and real backup/SAF roundtrip. Generated numbers use 0–9; user-authored task/note strings remain unchanged.
5. Only a separately reviewed integration PR can promote fully verified locales into production dictionaries and the language selector. Passing candidate lint does NOT permit activation.

**Inventory limits:** currently 25 explicit catalogs / 472 keys; this is not a complete native/dynamic runtime screen inventory. A prior exact-head audit found 4,626 original-20 missing language/key pairs, 20 English-identical candidates and 94 unmarked static copy candidates. Those gaps are independent blockers.

**Safety:** `validateDraft(...).valid` means only the provided candidate text is structurally safe. `readyForRuntime` and `approvedForMerge` always remain `false`. `approved/` self-attested bundles are rejected by the admission guard until separately verifiable human/Android evidence exists. No new language is enabled by this PR.
## Current candidate packs and native Android discovery

- `drafts/sw.json`: 88 source-aligned Swahili web UI text candidates.
- `drafts/ro.json`: 88 source-aligned Romanian web UI text candidates. Three correct-looking source-identical words are explicitly annotated **NEEDS_REVIEW**, never automatically approved.
- `native_drafts/sw.json` and `native_drafts/ro.json`: 10 candidate translations per locale for discovered native Android backup toasts, timer notification text and notification channels. The product brand is left unchanged.
- `native_copy.cjs --report` inventories untranslated Java callsite strings, including their source paths and line numbers; it does not mutate Android resources.
- `native_drafts.cjs --report` checks native candidate key identity, source tokens, Unicode controls and Western 0–9. A successful check does not mean native UI is localized.
- `coverage.cjs --report` emits an exact-checkout summary of all 100 registered languages, original 20 source gaps, draft candidates, untouched source keys and native text gaps. It explicitly reports **zero certified new languages**.

These 196 initial web/native strings are drafts only, not native-reviewed translations. Before promotion, verify terminology and functionality in each context. The 20-language existing app remains unchanged.
## Commands

Run at repository root:
- `node --test tests/localization_20/locale100_gate.test.cjs tests/localization_20/locale100_drafts.test.cjs`
- `node tools/localization_100/guard.cjs --check`
- `node tools/localization_100/drafts.cjs --report`
- `node tools/localization_100/native_copy.cjs --report`
- `node tools/localization_100/native_drafts.cjs --report`
- `node tools/localization_100/coverage.cjs --report`
- `node tools/localization_100/drafts.cjs --worksheet sw > /tmp/sw-review-worksheet.json`
- `node tools/localization_100/guard.cjs --template sw > /tmp/sw-draft.json`
- `node tools/language_review/audit.cjs --out /tmp/df-locale-audit`

The template emits all known canonical English source keys with **null** translations, never machine-generated filler. The source SHA256 inventory guard invalidates stale packs. Review each translated string's context, plurals, tokens, grammar, native OS labels, dynamic dialogs and accessible graphs. Source-identical text needs explicit reviewed exemptions.

Each language requires human native-linguist approval, full screen/dialog/notification/backup/export coverage, 320–430px phone UI, RTL/LTR and script checks, 0–9 generated digits, offline reload, TalkBack, real Android WebView + SAF interaction, and unchanged user-authored notes, tasks and storage v21. Every review gate and a matching exact-source hash must pass. Semantic accuracy cannot be established by Node tests alone.

Source inventory is a **starting point**, not a complete runtime DOM extraction. Current change does not touch app.js, index.html, v21 data, active UI or app language switching. Do not add unreviewed entries to runtime LANG_CATALOG. Integration owner must separately wire each independently certified locale into the app, with own Android evidence and manual review; no automatic merge, release or translation.

Unicode locale-identification reference: https://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code

**Current status:** 100 registered | 20 existing unchanged | 80 planned/not selectable | 0 new certified | full Android and translation review NOT_TESTED | production release NO.
