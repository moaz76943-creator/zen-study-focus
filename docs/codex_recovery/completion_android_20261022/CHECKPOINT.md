# Completion/restore/SAF/Android batch — 2026-10-22
RELEASE_APPROVED=NO.
Verified integration HEAD8b0a8ba238454df5b51e3563af43cd2a1903e774 via API after
git fetch503; local exact object exists. Read origin/main AGENTS and latest
CURRENT_CHECKPOINT, previous batch receipts available in conversation/GitHub.

Task1: normal finalize requires terminal snapshot acknowledgment and successful
next-mode selection before chime. Refusal retains credited ID for idempotent retry;
training path from181 unchanged. RED18 FAIL, GREEN18 PASS, focused132 PASS,
startup/syntax/diff PASS. Tests execute actual credit/writer/selector/finalizer.
Owner: existing integration_recovery qa. No schema/key/credit algorithm changes.
Commands: node --test tests/integration_recovery/normal_timer_completion.test.cjs;
timeout45 node --test same plus activity_transition_durability.test.cjs,
timer_credit_durability.test.cjs, tests/track05_timer/*.test.cjs and
tests/timer_native_bridge/native_timer_contract.test.cjs; timeout40 node tests/smoke_app.cjs;
node --check app.js; git diff --check.
Reviewed normal finalizer only; no repeat of176–181 repairs. Rollback scoped revert.
SOURCE_PASS; Android/SAF/device NOT_TESTED. Publish/review/integration-only merge,
verify SHA and receipt before Task2. User explicitly authorizes sequential merges.

Task1 merged PR182:8d26ea3a4b88213643951381e101b15f7d618297, receipt on GitHub
before Task2. Task2 based exactly on that merge.
Task2 RED4 FAIL/5 PASS -> GREEN9 PASS; focused141 PASS; smoke/syntax/diff PASS.
restore now clears previous interval/running/target before applying valid snapshot,
uses paused icon unless running, and retains full saved label (previously cut100).
Real loader/writer/restore/validator/credit tests cover paused/live/expired,
training rounds, task7 binding, idempotent credit and no repeated expiry chime.
Initial fixture omitted actual tasksList, causing2 false task-link failures;
added real synthetic task7, then reran baseline RED before production fix.
No stored packet rewrite for live/paused restore. No v21 format/key change.
New suite owns existing qa directory. Commands: node --test timer_reopen_durability
plus Task1 focused suites; source smoke/syntax/diff. Final paused-icon assertion
and focused reopen9 rerun after final UI change; no unrelated suite repetition.
Reviewed restore-only source diff. Rollback scoped revert. SOURCE_PASS;
Android/process-death/power-loss NOT_TESTED. Next publish/review/integration merge,
verify receipt before SAF work. RELEASE_APPROVED=NO.
