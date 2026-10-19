# Batch 02 — durable timer completion

BASE_SHA: 0b12c8c
ISSUES_FIXED (source scope): DF-078/112/113/122/154/155, DF4-012/013/018/027/034.

Confirmed failure: creditCompletedSession mutated counters, duplicate-ID ledger, history and training remainder before the durable write. A refused write left a phantom completed ID in memory and made the retry a no-op. Five new contract cases failed before the fix.

Credit is now built on a detached cfg candidate and committed through the existing six-packet integration journal before publishing. The old standalone host also requires verified primary/mirror acknowledgement. Failed credit leaves counters/history/remainder unchanged, keeps the completed session ID and actual elapsed time, and stops phase/training advancement and success events. Play at 00:00 retries the pending completion rather than starting another session. No extra minute, new ID, or duplicate callback credit is added. Existing persisted timer snapshot supports reload reconciliation; no v21 schema/key or native bridge change.

TEST_COMMANDS: node --test tests/integration_recovery/{timer_credit_durability,restore_journal}.test.cjs; node --test tests/focus_workflows/test_focus_workflows.cjs; node tests/smoke_app.cjs.
TEST_RESULTS: 9/9 focused durability/journal PASS, 8/8 focus-workflow PASS, smoke PASS. Real integration fault injection rolls back exact packet bytes on a failed cfg mirror, then retries once preserving unknown fields. Raw failing-before output: /workspace/scratch/completion-evidence/timer-red.log.
ACTUAL_ANDROID_TESTS: NOT_TESTED. Native DND/Bluetooth/process-death acceptance remains unverified.
NEXT_BATCH: review all remaining write entry points, dynamic locale refresh and Android DOM on an exact new test build.
