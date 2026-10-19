# DF-04 localization test evidence

Scope: 20 supported codes, 29 new Analytics labels per code, numeral helpers and opt-in DOM adapter. The default in-app 20-language dictionary remains unchanged.

## Source-level test cases

- Complete 20-code registry with all ar/fa/ur options and strict identical 29 keys per locale.
- Unknown keys yield `null` without visible internal names; no blank translations.
- Arabic/Persian/Urdu are RTL; other 17 locales remain LTR; regional tags resolve.
- All twenty locales format 0, 9, 10, 25, 100, 1234, -2 and 0.75 with Western digits. Generated ISO-like input examples `2026-10-19`, `00:05` and percentages are checked for `0123456789`.
- Date formatting with native month/day ordering and `latn` digits; string normalization only for generated presentation.
- Unannotated DOM and user content are unchanged; tagged labels update on language switch, with locale/dir markers. Input values must not be rewritten.
- Language-change controller invokes persistence before rendering, updates exactly once and leaves current language unchanged on persistence failure. No localStorage or note/task data access.
- Node suite is invoked by a Python unittest discovery wrapper within existing repository CI.
  
## Unsupported claims and required device checks

These automated tests are NOT full screen coverage. Pending with integration owner 00:
- 20-language switching while each of Notes, Tasks, Analytics, Calendar, Timer, Goals, Training, Sounds and Backup dialogs is visible.
- 320 px screen, landscape, soft keyboard, RTL mixed with original Latin/German/Arabic note bodies, numeric bidi ordering.
- Accessibility hierarchy: TalkBack labels, keyboard focus, SVG chart accessibility, modal focus; compare Android native translations.
- Backup export/import with preserved cfg language and saved custom note/task bodies.
- On-device confirmation that no generated Arabic-Indic/Persian numeral glyphs appear in any UI, SVG, CSV, dialog or notification. User-entered glyphs are exempt.
- PR #12: no language filtering and no forced English on startup or backup import.

Do not tick off DF-058 or publish a production-ready localization claim until device snapshots and the actual integration build have evidence.
