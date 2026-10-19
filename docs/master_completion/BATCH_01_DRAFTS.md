# Batch 01 — verified drafts and close protection

BASE_SHA: f31cfb0
ISSUES_FIXED (source scope): DF-075, DF-089, DF-090; DF4-015/027.

Four negative regression cases failed before the change: a same-millisecond refused save acknowledged stale content, toolbar-only edits could close before debounce with no loss confirmation, a null recall pair threw during draft loading, and a refused deletion still reported discarded.

Draft save now requires the real verified writer's true acknowledgement and exact readback of the full draft; generated timestamps alone are insufficient. Toolbar scheduling marks edits dirty before debounce. Corrupt recall entries are rejected without touching saved notes. Failed discard reports failure and retains recovery UI. Storage errors have a distinct Arabic/English message instead of an incorrect length error. Existing v1 draft key, v21 data, Unicode authored content and fingerprint contract are unchanged.

TEST_COMMANDS: node --test tests/notes_recovery/draft_guard.test.cjs tests/notes_ui/drafts.test.cjs; node tests/smoke_app.cjs.
TEST_RESULTS: 12/12 focused PASS; legacy smoke PASS. Four failing-before cases in /workspace/scratch/completion-evidence/draft-red.log. Existing simulated adapters now return the same explicit acknowledgement required of the real writer.
ACTUAL_ANDROID_TESTS: NOT_TESTED. No device/production acceptance inferred.
NEXT_BATCH: timer completion durability under quota failure; fail without publishing fake counters or discarding the completed session.
