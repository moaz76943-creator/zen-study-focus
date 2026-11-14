# Flashcards — architecture, status and limits

Section `#sec-flashcards` (Arabic: البطاقات التعليمية), opened from the Notes screen. No new permission, no network API.

## Discovery result (what existed before)
- `df_flashcards_v1`: **not a production key.** Nothing wrote to it; it was only read by `vault_backup.js` / `widget_sync.js` and written on vault restore. No Flashcards UI existed.
- `df_cards_v1` / `df_vocab_bank`: only backup mirrors, plus cards the Tri-Zone note engine auto-derives from a sample note (ids `fc_...`). These are **not** migrated.
- `modules/flashcards/fsrs.js` (FSRS-4.5 formulas, default weights) was reused. No optimizer.
- Native bridge is `ZenNative` (Java, WebView). There was no TTS code.

## Storage (one system, no second database)
| Key | Content |
|---|---|
| `df_fc_meta_v1` | decks, preferences, sessions, daily counters, active session, migration flags |
| `df_fc_cards_v1_<n>` | cards in chunks of 500 (only changed chunks are rewritten) |
| `df_fc_quarantine_*` | raw copy of an unreadable chunk (never deleted silently) |
Legacy keys (`df_flashcards_v1`, `df_vocab_bank_v1`, `df_vocab_flashcards_v21`, and non-sample items of `df_cards_v1`/`df_vocab_bank`) are read once for a non-destructive migration into a deck named "Imported"; they are never modified or removed. The six v21 keys are untouched.
Capacity is the WebView localStorage quota (about 5 MB); writes that do not fit fail with `STORAGE_FULL` and roll back.

## Scheduling
FSRS-4.5 formulas (default weights) for review cards plus fixed learning steps of 1 and 10 minutes. States: new, learning, review, relearning, suspended. Hard < Good < Easy intervals are enforced. Editing text never touches scheduling fields; a substantial change (>= 50 % edit distance) flags the card and makes it due again, with a visible reason. Submissions are idempotent (`submissionId`), so resuming a session cannot double-count.

## Backup
ZEN21 backups now carry `flashcardsV2` (decks, cards, review log, preferences, per-language speech preferences, daily counters). Restore validates every field (ids, deck references, enums, bounds) before writing, then writes with verification and rolls back on failure. `vault_backup.js` is a separate, older encrypted export and does not include flashcardsV2. A checksum is not authentication; ZEN21 integrity is detection of accidental damage only.

## Text-to-speech
`NativeTts.java` wraps the device engine (init, engines, languages, language status, voices, speak, stop, shutdown). Rules enforced: no cloud API; a missing language is reported and never replaced by another; `offlineOnly` refuses network voices; rate/pitch bounded to 0.5–2.0; Android has **no gender API**, so gender is `male`/`female` only when the engine puts that exact token in the voice features, otherwise `unknown`; pitch is independent and never presented as changing gender; Android TTS cannot pause/resume, so the UI offers stop and replay only. Speech stops on tab change, app pause and destroy.
Repetitions 1–9: JS starts the next utterance only after the native `done` event; failed or cancelled attempts are not counted.

## Honest status
| Area | Status |
|---|---|
| Core data, CRUD, decks, duplicate detection, undo | IMPLEMENTED AND VERIFIED (22 unit tests, real-browser flow) |
| FSRS scheduling, queue, session resume, analytics | IMPLEMENTED AND VERIFIED (unit tests; algorithm not compared against a reference FSRS library) |
| Search incl. Arabic diacritics | IMPLEMENTED AND VERIFIED |
| CSV/TSV/JSON import (preview, transactional), CSV export | IMPLEMENTED AND VERIFIED (Anki packages NOT supported) |
| ZEN21 backup/restore of flashcards | IMPLEMENTED AND VERIFIED (round trip in browser) |
| Study modes classic/reverse/both/listening/pronunciation/writing/quick/random/custom | IMPLEMENTED BUT NOT FULLY VERIFIED (classic and multiple choice exercised end to end in browser; others only by unit tests of their helpers) |
| Multiple choice, fill in the blank, mixed practice, typed answers (exact / close spelling / different) | IMPLEMENTED (helpers unit-tested; multiple choice driven in a real browser; cloze and typed UI not browser-driven) |
| Mistake review and "Repeat mistakes" at session end | IMPLEMENTED BUT NOT FULLY VERIFIED (missed list built from Again ratings; not browser-driven) |
| Multiple meanings | IMPLEMENTED — separate lines or `;` in the back text are accepted as alternative answers |
| Deep Focus timer integration | IMPLEMENTED BUT NOT FULLY VERIFIED — uses the existing timer functions only; browser test confirms flashcards do not change timer accounting; live countdown display not browser-verified |
| Settings: text size, examples, default mode/deck, daily target | IMPLEMENTED (text size applied in browser test; others not individually driven) |
| Search language filter, import column mapping, cancel, importing state | IMPLEMENTED BUT NOT FULLY VERIFIED (import progress is a busy state, not a percentage) |
| Play example audio | IMPLEMENTED BUT NOT VERIFIED (needs device TTS) |
| Separate main-navigation button | NOT IMPLEMENTED — entry is under Notes to keep the bottom bar uncrowded |
| Native TTS bridge (Java) | IMPLEMENTED BUT NOT VERIFIED — Java is compiled only by CI; never run on an emulator or device |
| JS speech controller | IMPLEMENTED AND VERIFIED against a fake bridge (logic only) |
| Male voice preference | PARTIALLY IMPLEMENTED — only voices the engine labels male can be preferred; many devices label none |
| Offline voices | BLOCKED BY PLATFORM — depends on installed voice data; reported per voice |
| Emulator tests of native TTS | IMPLEMENTED, RESULT PENDING — `tests/android_tts` instrumentation runs the shipped `NativeTts` on API 30/35 emulators via `.github/workflows/native_tts_emulator.yml`; see the workflow run for actual results. Images without an engine/voice data report SKIP lines, never PASS. Audible output and voice quality are NOT verifiable on an emulator |
| Translations | PARTIAL — English and Arabic complete; 18 other locales have NO reviewed pack and show English. `tests/flashcards_locale_coverage.test.cjs` pins that gap list (it may only shrink) and fails on any incomplete or English-copy pack. Add a reviewed pack as `S.<code>` in flashcards_ui.js |
| 50,000 cards | BLOCKED BY STORAGE — localStorage quota is far below 50k cards; 10k small cards fit; measured in Node only |
| Quick edit during study, undo | Quick edit IMPLEMENTED; undo works for edit/delete/move (last 20, in memory only) |
| Pronunciation CSV export file name | LIMITATION — reuses the analytics CSV save dialog; falls back to clipboard |
| Virtual deck "Custom filters by tags/difficulty" | IMPLEMENTED in Custom session; no saved filters |

## Performance (Node, in-memory storage, not a phone)
10,000 cards: import ~60 ms, search ~7 ms, queue + stats ~8 ms. Real phone numbers are unmeasured.

## Needs a real device
Which voices/engines exist, whether a language needs data download, offline behaviour, audio quality, rate/pitch audibility, behaviour when the user changes the system TTS engine (the app re-initialises on request but this is untested).

## Review round (directive: final implementation review)
- Backup restore: a flashcards write failure is reported as a partial restore (never the green success toast); existing cards are kept (browser regression test).
- Old backups: `migrateLegacy({rescan:true})` re-imports legacy arrays without clearing flags or touching legacy keys; deduplicated (core + browser tests).
- CSV: formula guard now covers leading whitespace/control characters and `= + - @`; plain numbers stay readable (core test).
- Study modes: `tests/flashcards_modes.test.cjs` covers every mode's queue, session, resume, cancel, duplicate submissions, suspended/archived/empty cases. Only classic and multiple choice are driven through the real UI.
- Not done in this round: Android WebView performance benchmarks, reviewed translations for 18 locales, a physical-device pass.
