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

## Task 1 integration receipt

PR179 merged; integration verified `61a549f1751c2d373555476e8a4d13e828098940`.
Receipt comment6330457741 recorded on GitHub before Task2; main untouched.

## Task 2 — quick sport rest

Base exactly Task1 merge. RED8 FAIL/1 PASS; GREEN9 PASS; neighboring102 PASS;
startup/syntax/diff PASS. startQuickSportRest now uses one acknowledged transition
including running state and new ID, never separate Pause/Reset/Start writes.
Failed save/cancel preserves previous session/training/packets/native/UI; retry
starts one45-second short break without focus credit. Existing cancellation guard
retained. Static confirmation assertion now checks the actual transition boundary.
No #176–178 body changes. Same existing test ownership, no manifest edit.

Commands: new sport cases selected with `node --test --test-name-pattern='P0 sport rest' tests/integration_recovery/activity_transition_durability.test.cjs`.
Neighbors: `timeout 45 node --test tests/integration_recovery/activity_transition_durability.test.cjs tests/integration_quality/activity_domain_durable_ack.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/track05_timer/*.test.cjs tests/track07_functional/timer_destructive_shortcuts.test.cjs tests/focus_workflows/test_focus_workflows.cjs`.
Smoke/syntax/diff as Task1. Reviewed minimal one-caller diff and correct persisted
mode/running/seconds/new identity. Next: publish/review/merge integration, verify
SHA and GitHub checkpoint before Task3. Device/process-death/SAF/build/heavy gates
remain NOT_TESTED; RELEASE_APPROVED=NO. Rollback scoped revert.
