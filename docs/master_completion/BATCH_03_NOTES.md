# Batch 03 — legacy Notes fallback safety

BASE_SHA: 1a72e8f
ISSUES_FIXED (source scope): DF-059/075/078/090/100; DF4-015/027/034.

The real advanced editor already has guarded commits, so it was preserved. Its older Notes Studio fallback still mutated notesList before acknowledging save, normalized user-authored digits, and let edit/flag/duplicate act on ambiguous IDs. This path is now candidate-based through the existing commitLegacyRecords adapter. Failed edits retain the modal/content, no success toast, no changed in-memory notes; retry preserves numeric IDs, Unicode, unknown fields and extensions. Stale edit snapshots and ambiguous historical IDs are blocked without deleting or renumbering records. Rendering title/body also preserves authored digits.

TEST_COMMAND: node --test tests/integration_recovery/notes_fallback_durability.test.cjs; node tests/smoke_app.cjs.
TEST_RESULT: 3/3 focused PASS and smoke PASS. The same tests executed against the parent revision failed (notes-fallback-red.log). No alternate engine/schema was introduced.
ACTUAL_ANDROID_TESTS: NOT_TESTED.
NEXT_BATCH: live language refresh in an already-open editor and filters, preserving unsaved text.
