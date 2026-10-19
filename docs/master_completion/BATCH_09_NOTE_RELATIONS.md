# Batch 09 — real note relations and duplicate action

BASE_SHA: 1b06fc8
ISSUES_FIXED (source/desktop scope): DF-096/097/104/116, DF4-014/015/034.

The existing controller supported note links, task links and duplication, but integration supplied no link-target adapters and the real card omitted duplication. Preserved the real engines and connected the missing actions through the Notes overflow menu. The chooser displays searchable record titles/date, not internal numeric IDs; it filters Arabic diacritics without rewriting records, excludes ambiguous/string/starter/deleted IDs and self-note links, and retains separate note/task numeric namespaces. Its visible list is capped at 100 and search is debounced. Cancel/Escape/Android Back close the chooser without writing. Selected IDs pass through existing guarded, journaled core operations. Notes can now be duplicated with unique numeric IDs from the real card.

Dynamic action handling awaits the chooser and catches rejected operations; Arabic confirmation and extraction dialogs use the existing Notes translator. Language editorial/full 20-locale Notes work remains incomplete; no blanket locale acceptance is implied.

TEST_COMMANDS: node --test tests/integration_recovery/note_link_picker.test.cjs tests/integration_recovery/back_draft_guard.test.cjs tests/notes_ui/*.test.cjs; node tests/df4_browser/completion.cjs.
TEST_RESULTS: 45/45 focused Node PASS; 24 desktop browser scenarios PASS, including actual overflow → chooser → existing-core relation commit and duplicate, unique IDs and persisted Unicode. Clipboard/permissions/audio/hardware claims are outside this scope.
ACTUAL_ANDROID_TESTS: NOT_TESTED for this new chooser. On earlier SHA 1b06fc8, API30 CDP bootstrap PASS was observed, while original UIAutomator scenarios were 0 PASS / 0 FAIL / 20 NOT_TESTED. API35 remains unverified after bounded loading/protocol failures; no app-code workaround was guessed from those logs.
NEXT_BATCH: actual Android DOM/touch core flows on a fresh API30 profile and final exact-SHA regression/build ledger.
