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

Task2 merged PR183:0b517904dec1c85be97b82a29db380e4649d9f6f, checkpoint on GitHub
before Task3. Task3 isolated candidate begins at that exact merge.
PR152042327d port: only MainActivity60lines/index2lines missing from integration,
no locale-draft changes. Existing source tests RED6 FAIL -> source18 PASS with
security/data resilience. Same validator/consent/nativeACK; no new import engine.
PR159 latest39601644398 built successfully but actual import consent NOT_TESTED;
CDP/native ACK and export passed historically, not proof for this integrated tree.
Reusable local-only CDP/DocumentsUI/MediaStore helpers copied from159 with bounded
new cases: real file, consent cancel, picker cancel, corrupt, >8MiB, consent accept,
exact IDs/unknown fields/nativeACK/reopen. API30 job reuses existing build/emulator
lane steps,25min job/300s probe bound, exact HEAD/tree/APK receipts, no signing.
Script/bash syntax PASS, source18 PASS. ANDROID pending. No import merge before
actual path proven. PR remains isolated if FAIL/NOT_TESTED. No main/package/data
migration. User-device data never used; disposable emulator required. New scripts
are in existing android_e2e_recovery navigation ownership, source tests qa.
