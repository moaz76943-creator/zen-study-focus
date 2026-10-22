# Activity / training P0 batch — 2026-10-22

RELEASE_APPROVED=NO. User explicitly authorizes review and sequential integration
merges (never main), with each successful task committed/published before next.
Read main AGENTS, available conversation and current recovery checkpoints.
Verified integration base `9fa7a8239d19f902a2207060d15c2c2b6b54e406` already
contains #176–178. No repeat of those fixes.

## Task 1 — domain transition

RED8 FAIL /9 PASS; GREEN17 PASS; related82 PASS, startup/syntax/diff PASS.
Helper writes timer snapshot first, then cfg domain ACK; cfg failure restores
exact prior timer packets, including missing slots. Memory/native/UI only publish
after both succeed. Reuses existing v21 writer without schema/key changes.
Rollback readback failures throw TIMER_ROLLBACK_UNVERIFIED; never report success.
Preserves historical/unknown cfg fields, session identity/time/training on refusal.
Raw timer rollback is auxiliary-only; cfg writer retains its own dual-copy/native
ACK rollback contract. No cross-key power-loss atomicity or new journal claimed.

Tests use real writer and production functions. Existing domain suite now calls
actual transition instead of stubbed selectTimerMode; storage/order/cancel checks
retained. New suite lives in existing integration_recovery ownership (qa), no new
manifest mapping. Shared fixture is not a second test suite.

Commands:
`node --test tests/integration_recovery/activity_transition_durability.test.cjs`
`timeout 45 node --test tests/integration_recovery/activity_transition_durability.test.cjs tests/integration_quality/activity_domain_durable_ack.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/integration_quality/verified_legacy_save.test.cjs tests/integration_recovery/native_durable_ack.test.cjs`
`timeout 40 node tests/smoke_app.cjs`
`node --check android/app/src/main/assets/web/app.js`; `git diff --check`.

Reviewed: cfg is never saved before timer rejection; no intermediate Pause,
no pre-save training cancellation, and no unrelated repaired timer body changes.
User-authorized next: publish, review PR, merge into integration only, verify SHA
and record receipt on GitHub before Task2. Rollback: scoped commit revert.
Android, background/process death, SAF, APK/AAB, heavy suite NOT_TESTED. Source
checks do not establish device durability or release approval.
