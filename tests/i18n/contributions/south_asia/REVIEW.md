# DF-LANE-20 — South Asia & RTL/Indic handoff

Branch: `lane20/south-asia-rtl-indic-contributions-20261025`
Target: `integration/master-qa-verified-v21`

This lane creates **independent contributions only**; it does not load them into Android.
No translation in this lane is designated **VERIFIED** by a native-speaker review.
Existing reviewed packs are not replaced. Integration into the canonical pack is owned by lane 02 and runtime wiring by lane 03.

## Locale and direction policy

- RTL: `ur` (Urdu), `fa` (Persian), `ps` (Pashto).
- LTR: `hi`, `bn`, `ta`, `te`, `mr`, `gu`, `kn`, `ml`, `pa` (Gurmukhi), `ne`, `si`, `ku` (Kurmanji, Latin script).
- `ku` is **Kurmanji in Latin script**, not Sorani; Sorani requires its own locale and RTL review.
- Urdu/Persian/Pashto mixed Latin tokens such as CSV and Western-number inputs require per-element bidi isolation when integrated. Do **not** inject global direction overrides.

## Coverage supplied

- All 15 locales now cover timer (11), analytics (17), analyticsDomain (4), goals (15), and notes (36) when combined with pre-existing reviewed packs.
- Remaining canonical tasks (64 keys) and all other modules outside these families are not yet provided by this lane.

## Verification and open items

Run: `node --test tests/i18n/contributions/south_asia/locale_contributions.test.cjs`

The test suite validates the contribution contract, namespace key parity, UTF-8 when parsed by Node, NFC, bidi-control filtering, forbidden numeral scripts, and script presence. It does **not** certify native-speaker quality, font shaping, or actual Android screen layout.

Still outstanding before 99-language claim:
- Missing tasks namespaces and other app sections must be covered by the lane 01 inventory; Quick Training, templates, audio and Android-native text are not covered by this source family.
- Check all tooltips, save/error confirmations, dialogs, analytics SVG/ARIA and native Toasts at runtime.
- Review long strings on 320/360/393/430 px, RTL dropdown selection, mixed Western digits, selection/caret in editable notes, and screenshots on API 30/35.
- Never normalize or transliterate numbers in user-authored notes or backups; UI-generated counters use ASCII 0–9.
- **Font QA handoff to lane 11:** inspect correct glyphs and conjunct shaping in Devanagari, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Gurmukhi, Sinhala; Arabic-script Nastaliq (Urdu), Arabic joining (fa/ps); compare Kurdish Latin diacritics. Report tofu boxes, broken combining marks, truncated ascenders and RTL punctuation.

Review status: `NEEDS_NATIVE_REVIEW` and `NEEDS_DEVICE_QA`, not `VERIFIED`.
